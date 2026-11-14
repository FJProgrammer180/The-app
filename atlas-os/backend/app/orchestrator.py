"""PostgreSQL/SQLite-persisted state machine orchestrator (single orchestrator).
States: queued, planning, plan_ready, running, awaiting_approval, paused,
verifying, completed, failed, cancelled, expired."""
import json, time
from datetime import datetime, timedelta, timezone
from pydantic import ValidationError
from sqlalchemy.orm import Session
from .models import (AgentTask, AgentPlan, TaskStep, ToolExecution, ApprovalRequest,
                     ExecutionEvent, UsageRecord, Artifact, WorkspaceDocument)
from .planner import get_planner, validate_plan, PlanValidationError
from .registry import REGISTRY, Ctx, canonical_hash
from . import policy

APPROVAL_TTL_MIN = 15
MAX_TOOL_RETRIES = 2

def emit(db: Session, task_id: str, event_type: str, payload: dict):
    last = db.query(ExecutionEvent).filter_by(task_id=task_id).order_by(ExecutionEvent.sequence_number.desc()).first()
    ev = ExecutionEvent(task_id=task_id, event_type=event_type,
                        sanitized_payload={k: (str(v)[:500]) for k, v in payload.items()},
                        sequence_number=(last.sequence_number + 1 if last else 1))
    db.add(ev); db.commit(); return ev

def _resolve(value, outputs: dict):
    if isinstance(value, str) and value.startswith("$"):
        ref, _, field = value[1:].partition(".")
        out = outputs.get(ref, {})
        return out.get(field) if field else out
    if isinstance(value, dict): return {k: _resolve(v, outputs) for k, v in value.items()}
    if isinstance(value, list): return [_resolve(v, outputs) for v in value]
    return value

def create_and_plan(db: Session, user, workspace_id: str, objective: str, autonomy: str, session_id=None) -> AgentTask:
    task = AgentTask(session_id=session_id, workspace_id=workspace_id, user_id=user.id,
                     objective=objective, autonomy_policy=autonomy, status="planning")
    db.add(task); db.commit()
    emit(db, task.id, "task_created", {"objective": objective[:200], "autonomy_policy": autonomy})
    emit(db, task.id, "planning_started", {"provider": "mock"})
    planner = get_planner()
    try:
        plan = validate_plan(planner.plan(objective))
    except PlanValidationError as e:
        task.status = "failed"; task.summary = f"Plan validation failed: {e}"; db.commit()
        emit(db, task.id, "task_failed", {"error": str(e)}); return task
    rec = AgentPlan(task_id=task.id, version=1, plan_json=plan, validation_status="valid")
    db.add(rec); db.flush()
    for s in plan["steps"]:
        db.add(TaskStep(task_id=task.id, plan_id=rec.id, step_key=s["id"], tool_name=s["tool"],
                        purpose=s.get("purpose",""), arguments=s.get("arguments",{}),
                        dependencies=s.get("dependencies",[]), expected_output=s.get("expected_output","")))
    task.current_plan_version = 1; task.status = "plan_ready"; db.commit()
    db.add(UsageRecord(user_id=user.id, task_id=task.id, provider=planner.name, model=planner.model,
                       input_tokens=len(objective)//4, output_tokens=len(json.dumps(plan))//4)); db.commit()
    emit(db, task.id, "plan_created", {"steps": len(plan["steps"]), "provider": planner.name})
    return task

def _execute_tool(db, ctx: Ctx, task, step: TaskStep, args: dict, idem: str) -> ToolExecution:
    tool = REGISTRY[step.tool_name]
    existing = db.query(ToolExecution).filter_by(idempotency_key=idem).first()
    if existing and existing.execution_status == "completed":
        return existing  # idempotent: never repeat a completed side effect
    ex = existing or ToolExecution(task_id=task.id, step_id=step.id, tool_name=tool.name, tool_version=tool.version,
                                   input_hash=canonical_hash(args), sanitized_arguments=args,
                                   execution_status="running", idempotency_key=idem)
    db.add(ex); db.commit()
    emit(db, task.id, "tool_call_started", {"step": step.step_key, "tool": tool.name})
    started = time.time()
    try:
        validated = tool.input_model.model_validate(args)
        out = tool.handler(ctx, validated)
        result = out.model_dump() if hasattr(out, "model_dump") else dict(out)
        ex.execution_status = "completed"; ex.output_data = result
        ex.output_summary = {k: str(v)[:200] for k, v in result.items()}
        if tool.verification != "none":
            ex.verification_status = "verified" if result.get("verified", True) else "failed"
            ex.verification_detail = f"method={tool.verification}"
        step.status = "completed"; step.result_reference = json.dumps(result)[:1000]
    except ValidationError as e:
        ex.execution_status = "failed"; ex.error_category = "argument_validation"; ex.output_summary = {"error": str(e)[:300]}
        step.status = "failed"
    except Exception as e:
        ex.execution_status = "failed"; ex.error_category = type(e).__name__; ex.output_summary = {"error": str(e)[:300]}
        step.status = "failed"
    ex.duration_ms = int((time.time()-started)*1000); ex.completed_at = datetime.now(timezone.utc)
    step.completed_at = ex.completed_at; db.commit()
    emit(db, task.id, "tool_call_completed" if ex.execution_status=="completed" else "tool_call_failed",
         {"step": step.step_key, "tool": tool.name, "status": ex.execution_status,
          "duration_ms": ex.duration_ms, "error": ex.error_category or ""})
    return ex

def run_task(db: Session, user, task: AgentTask):
    """Execute pending steps in dependency order until done, approval pause, or failure."""
    if task.status in ("completed","cancelled","failed"): return task
    task.status = "running"; task.started_at = task.started_at or datetime.now(timezone.utc); db.commit()
    ctx = Ctx(db, user, task.workspace_id, task.id)
    outputs = {}
    steps = db.query(TaskStep).filter_by(task_id=task.id).order_by(TaskStep.created_at).all()
    for s in steps:  # restore outputs of already-completed steps (restart recovery)
        if s.status == "completed" and s.result_reference:
            try: outputs[s.step_key] = json.loads(s.result_reference)
            except Exception: pass
    for step in steps:
        if step.status == "completed": continue
        if task.status == "cancelled": break
        # re-check cancellation/paused from DB
        db.refresh(task)
        if task.status in ("cancelled","paused"): break
        tool = REGISTRY.get(step.tool_name)
        if not tool:
            step.status="failed"; db.commit(); task.status="failed"; task.summary=f"Unknown tool {step.tool_name}"
            db.commit(); emit(db, task.id, "task_failed", {"error": "unknown_tool"}); return task
        args = _resolve(step.arguments, outputs)
        emit(db, task.id, "step_started", {"step": step.step_key, "tool": tool.name})
        allowed, needs_approval, reason = policy.authorize_tool(db, user, task.workspace_id, tool, task.autonomy_policy)
        if not allowed:
            step.status="failed"; db.commit(); task.status="failed"; task.summary=f"Policy denied {tool.name}: {reason}"
            db.commit(); emit(db, task.id, "task_failed", {"error": reason, "tool": tool.name}); return task
        idem = f"{task.id}:{step.step_key}:{canonical_hash(args if isinstance(args,dict) else {})[:16]}"
        if needs_approval:
            ex = db.query(ToolExecution).filter_by(idempotency_key=idem).first()
            if not ex:
                ex = ToolExecution(task_id=task.id, step_id=step.id, tool_name=tool.name, tool_version=tool.version,
                                   input_hash=canonical_hash(args), sanitized_arguments=args,
                                   execution_status="awaiting_approval", idempotency_key=idem)
                db.add(ex); db.flush()
                ap = ApprovalRequest(task_id=task.id, tool_execution_id=ex.id, requester_id=user.id,
                    workspace_id=task.workspace_id, tool_name=tool.name, argument_hash=canonical_hash(args),
                    risk_level=tool.risk_level, expires_at=datetime.now(timezone.utc)+timedelta(minutes=APPROVAL_TTL_MIN),
                    proposed_action={"tool": tool.name, "arguments": args, "side_effect": tool.side_effect,
                                     "description": f"{tool.description}", "reversible": tool.risk_level < 2,
                                     "why_approval": reason})
                db.add(ap)
            step.status = "awaiting_approval"; task.status = "awaiting_approval"; db.commit()
            emit(db, task.id, "approval_requested", {"step": step.step_key, "tool": tool.name, "risk": tool.risk_level})
            return task
        emit(db, task.id, "tool_call_requested", {"step": step.step_key, "tool": tool.name})
        ex = _execute_tool(db, ctx, task, step, args, idem)
        if ex.execution_status != "completed":
            task.status = "failed"; task.summary = f"Step {step.step_key} ({tool.name}) failed: {ex.error_category}"
            task.completed_at = datetime.now(timezone.utc); db.commit()
            emit(db, task.id, "task_failed", {"step": step.step_key, "error": ex.error_category or ""}); return task
        outputs[step.step_key] = ex.output_data
        if ex.verification_status:
            emit(db, task.id, "verification_completed", {"step": step.step_key, "status": ex.verification_status})
            if ex.verification_status == "failed":
                task.status="failed"; task.summary=f"Verification failed at {step.step_key}"; db.commit()
                emit(db, task.id, "task_failed", {"error":"verification_failed"}); return task
    if all(s.status == "completed" for s in steps):
        task.status = "verifying"; db.commit(); emit(db, task.id, "verification_started", {})
        task.status = "completed"; task.completed_at = datetime.now(timezone.utc)
        arts = db.query(Artifact).filter_by(task_id=task.id).all()
        task.summary = f"Completed {len(steps)} steps. Artifacts: {', '.join(a.title for a in arts) or 'none'}."
        db.commit(); emit(db, task.id, "task_completed", {"artifacts": len(arts)})
    return task

def decide_approval(db: Session, user, approval: ApprovalRequest, approve: bool):
    now = datetime.now(timezone.utc)
    exp = approval.expires_at
    if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
    if approval.approval_status != "pending": raise ValueError("approval_not_pending_single_use")
    if exp < now:
        approval.approval_status="expired"; db.commit(); raise ValueError("approval_expired")
    task = db.get(AgentTask, approval.task_id)
    ex = db.get(ToolExecution, approval.tool_execution_id)
    step = db.get(TaskStep, ex.step_id)
    approval.decided_at = now; approval.decided_by = user.id
    if not approve:
        approval.approval_status="rejected"; ex.execution_status="rejected"; step.status="rejected"
        task.status="failed"; task.summary="Approval rejected by user — action was NOT executed."; task.completed_at=now
        db.commit(); emit(db, task.id, "approval_rejected", {"tool": approval.tool_name}); return task
    # revalidate exact arguments + authorization immediately before execution
    if canonical_hash(ex.sanitized_arguments) != approval.argument_hash:
        approval.approval_status="invalidated"; db.commit(); raise ValueError("argument_hash_mismatch")
    tool = REGISTRY[approval.tool_name]
    allowed, _, reason = policy.authorize_tool(db, user, task.workspace_id, tool, task.autonomy_policy)
    if not allowed: raise ValueError(f"revalidation_failed:{reason}")
    approval.approval_status="consumed"  # single-use
    db.commit(); emit(db, task.id, "approval_granted", {"tool": approval.tool_name})
    ctx = Ctx(db, user, task.workspace_id, task.id)
    # execute exactly once (idempotency key protects against repeats)
    ex2 = _execute_tool(db, ctx, task, step, ex.sanitized_arguments, ex.idempotency_key)
    if ex2.execution_status != "completed":
        task.status="failed"; task.summary=f"Approved action failed: {ex2.error_category}"; db.commit()
        emit(db, task.id, "task_failed", {"error": ex2.error_category or ""}); return task
    if approval.tool_name == "send_email":  # subsequent steps may exist; continue orchestration
        task.status="running"; db.commit()
    return run_task(db, user, task)
