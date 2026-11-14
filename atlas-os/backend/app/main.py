import asyncio, hashlib, json, os
from datetime import datetime, timezone
from fastapi import Depends, FastAPI, HTTPException, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from .db import Base, engine, get_db
from . import models as M
from .security import hash_pw, check_pw, issue_token, current_user, revoke
from .policy import require_workspace, membership
from .registry import REGISTRY
from .orchestrator import create_and_plan, run_task, decide_approval, emit

Base.metadata.create_all(bind=engine)
app = FastAPI(title="ATLAS OS API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# naive in-memory login rate limit
_login_hits: dict[str, list[float]] = {}
import time as _time

class AuthIn(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)
    display_name: str = ""
class WsIn(BaseModel): name: str = Field(min_length=1, max_length=160); description: str = ""
class DocIn(BaseModel): title: str; content: str
class TaskIn(BaseModel): workspace_id: str; objective: str = Field(min_length=3, max_length=4000); autonomy_policy: str = "supervised"; session_id: str | None = None
class SessionIn(BaseModel): workspace_id: str; title: str = "Session"
class MemIn(BaseModel): workspace_id: str; content: str; memory_type: str = "workspace"; source_reference: str = ""

def ws_out(w): return {"id": w.id, "name": w.name, "description": w.description, "owner_id": w.owner_id, "created_at": str(w.created_at)}
def task_out(t): return {"id": t.id, "objective": t.objective, "status": t.status, "workspace_id": t.workspace_id,
                         "autonomy_policy": t.autonomy_policy, "summary": t.summary, "created_at": str(t.created_at),
                         "completed_at": str(t.completed_at) if t.completed_at else None}

@app.get("/api/v1/health")
def health(): return {"status": "ok", "service": "atlas-os", "llm_provider": "mock (deterministic, labelled)",
                      "email_provider": os.getenv("ATLAS_EMAIL_PROVIDER", "not_configured")}

@app.post("/api/v1/auth/register")
def register(body: AuthIn, db: Session = Depends(get_db)):
    if db.query(M.User).filter_by(email=body.email.lower()).first(): raise HTTPException(409, "Email already registered")
    u = M.User(email=body.email.lower(), password_hash=hash_pw(body.password), display_name=body.display_name or body.email.split("@")[0])
    db.add(u); db.flush()
    ws = M.Workspace(owner_id=u.id, name="My Workspace"); db.add(ws); db.flush()
    db.add(M.WorkspaceMember(workspace_id=ws.id, user_id=u.id, role="owner")); db.commit()
    return {"token": issue_token(db, u.id), "user": {"id": u.id, "email": u.email, "display_name": u.display_name}, "workspace_id": ws.id}

@app.post("/api/v1/auth/login")
def login(body: AuthIn, db: Session = Depends(get_db)):
    hits = [t for t in _login_hits.get(body.email, []) if _time.time()-t < 60]
    if len(hits) >= 10: raise HTTPException(429, "Too many login attempts")
    _login_hits[body.email] = hits + [_time.time()]
    u = db.query(M.User).filter_by(email=body.email.lower()).first()
    if not u or not check_pw(body.password, u.password_hash): raise HTTPException(401, "Invalid credentials")
    return {"token": issue_token(db, u.id), "user": {"id": u.id, "email": u.email, "display_name": u.display_name}}

@app.post("/api/v1/auth/logout")
def logout(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    revoke(authorization, db); return {"ok": True}

@app.get("/api/v1/auth/me")
def me(user: M.User = Depends(current_user)): return {"id": user.id, "email": user.email, "display_name": user.display_name}

@app.get("/api/v1/workspaces")
def list_ws(user=Depends(current_user), db: Session = Depends(get_db)):
    ids = [m.workspace_id for m in db.query(M.WorkspaceMember).filter_by(user_id=user.id)]
    return [ws_out(w) for w in db.query(M.Workspace).filter(M.Workspace.id.in_(ids)).all()] if ids else []

@app.post("/api/v1/workspaces")
def create_ws(body: WsIn, user=Depends(current_user), db: Session = Depends(get_db)):
    w = M.Workspace(owner_id=user.id, name=body.name, description=body.description); db.add(w); db.flush()
    db.add(M.WorkspaceMember(workspace_id=w.id, user_id=user.id, role="owner")); db.commit(); return ws_out(w)

@app.get("/api/v1/workspaces/{workspace_id}")
def get_ws(workspace_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    require_workspace(db, workspace_id, user.id); w = db.get(M.Workspace, workspace_id); return ws_out(w)

@app.patch("/api/v1/workspaces/{workspace_id}")
def patch_ws(workspace_id: str, body: WsIn, user=Depends(current_user), db: Session = Depends(get_db)):
    require_workspace(db, workspace_id, user.id, "admin"); w = db.get(M.Workspace, workspace_id)
    w.name, w.description = body.name, body.description; db.commit(); return ws_out(w)

# --- documents (workspace content the tools operate on) ---
@app.get("/api/v1/workspaces/{workspace_id}/documents")
def list_docs(workspace_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    require_workspace(db, workspace_id, user.id)
    return [{"id": d.id, "title": d.title, "version": d.version, "preview": d.content[:200]} for d in db.query(M.WorkspaceDocument).filter_by(workspace_id=workspace_id)]

@app.post("/api/v1/workspaces/{workspace_id}/documents")
def create_doc(workspace_id: str, body: DocIn, user=Depends(current_user), db: Session = Depends(get_db)):
    require_workspace(db, workspace_id, user.id, "member")
    d = M.WorkspaceDocument(workspace_id=workspace_id, owner_id=user.id, title=body.title, content=body.content)
    db.add(d); db.flush(); db.add(M.DocumentVersion(document_id=d.id, version=1, title=d.title, content=d.content)); db.commit()
    return {"id": d.id, "title": d.title, "version": 1}

@app.get("/api/v1/workspaces/{workspace_id}/internal-tasks")
def list_itasks(workspace_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    require_workspace(db, workspace_id, user.id)
    return [{"id": t.id, "title": t.title, "priority": t.priority, "status": t.status, "deadline": t.deadline}
            for t in db.query(M.InternalTask).filter_by(workspace_id=workspace_id)]

# --- agent sessions ---
@app.post("/api/v1/agent/sessions")
def create_session(body: SessionIn, user=Depends(current_user), db: Session = Depends(get_db)):
    require_workspace(db, body.workspace_id, user.id)
    s = M.AgentSession(workspace_id=body.workspace_id, user_id=user.id, title=body.title); db.add(s); db.commit()
    return {"id": s.id, "title": s.title, "workspace_id": s.workspace_id}

@app.get("/api/v1/agent/sessions")
def list_sessions(workspace_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    require_workspace(db, workspace_id, user.id)
    return [{"id": s.id, "title": s.title, "status": s.status} for s in db.query(M.AgentSession).filter_by(workspace_id=workspace_id, user_id=user.id)]

# --- tasks ---
@app.post("/api/v1/agent/tasks")
def create_task(body: TaskIn, user=Depends(current_user), db: Session = Depends(get_db)):
    require_workspace(db, body.workspace_id, user.id, "member")
    if body.autonomy_policy not in ("read_only","supervised","autonomous_internal"): raise HTTPException(422, "Invalid autonomy_policy")
    task = create_and_plan(db, user, body.workspace_id, body.objective, body.autonomy_policy, body.session_id)
    return task_out(task)

@app.get("/api/v1/agent/tasks")
def list_tasks(workspace_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    require_workspace(db, workspace_id, user.id)
    return [task_out(t) for t in db.query(M.AgentTask).filter_by(workspace_id=workspace_id).order_by(M.AgentTask.created_at.desc())]

@app.get("/api/v1/agent/tasks/{task_id}")
def get_task(task_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    t = db.get(M.AgentTask, task_id)
    if not t: raise HTTPException(404, "Task not found")
    require_workspace(db, t.workspace_id, user.id)
    plan = db.query(M.AgentPlan).filter_by(task_id=task_id).order_by(M.AgentPlan.version.desc()).first()
    steps = db.query(M.TaskStep).filter_by(task_id=task_id).order_by(M.TaskStep.created_at).all()
    execs = db.query(M.ToolExecution).filter_by(task_id=task_id).order_by(M.ToolExecution.created_at).all()
    return {**task_out(t), "plan": plan.plan_json if plan else None,
            "steps": [{"id": s.id, "step_key": s.step_key, "tool": s.tool_name, "purpose": s.purpose, "status": s.status,
                       "arguments": s.arguments, "dependencies": s.dependencies, "result": s.result_reference[:500]} for s in steps],
            "executions": [{"id": e.id, "tool": e.tool_name, "status": e.execution_status, "arguments": e.sanitized_arguments,
                            "output": e.output_summary, "duration_ms": e.duration_ms, "error": e.error_category,
                            "verification": e.verification_status, "idempotency_key": e.idempotency_key} for e in execs]}

def _owned_task(db, task_id, user):
    t = db.get(M.AgentTask, task_id)
    if not t: raise HTTPException(404, "Task not found")
    require_workspace(db, t.workspace_id, user.id); return t

@app.post("/api/v1/agent/tasks/{task_id}/start")
def start_task(task_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    t = _owned_task(db, task_id, user); return task_out(run_task(db, user, t))

@app.post("/api/v1/agent/tasks/{task_id}/pause")
def pause_task(task_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    t = _owned_task(db, task_id, user)
    if t.status == "running": t.status = "paused"; db.commit()
    return task_out(t)

@app.post("/api/v1/agent/tasks/{task_id}/resume")
def resume_task(task_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    t = _owned_task(db, task_id, user)
    if t.status in ("paused","plan_ready"): t.status = "running"; db.commit(); return task_out(run_task(db, user, t))
    return task_out(t)

@app.post("/api/v1/agent/tasks/{task_id}/cancel")
def cancel_task(task_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    t = _owned_task(db, task_id, user)
    t.status = "cancelled"; t.completed_at = datetime.now(timezone.utc); db.commit()
    for a in db.query(M.ApprovalRequest).filter_by(task_id=task_id, approval_status="pending"):
        a.approval_status = "invalidated"
    db.commit(); emit(db, task_id, "task_cancelled", {}); return task_out(t)

@app.get("/api/v1/agent/tasks/{task_id}/events")
def task_events(task_id: str, after: int = 0, user=Depends(current_user), db: Session = Depends(get_db)):
    _owned_task(db, task_id, user)
    evs = db.query(M.ExecutionEvent).filter(M.ExecutionEvent.task_id==task_id, M.ExecutionEvent.sequence_number>after).order_by(M.ExecutionEvent.sequence_number).all()
    return [{"id": e.id, "sequence": e.sequence_number, "type": e.event_type, "payload": e.sanitized_payload, "created_at": str(e.created_at)} for e in evs]

@app.get("/api/v1/agent/tasks/{task_id}/events/stream")
async def task_stream(task_id: str, after: int = 0, token: str = "", authorization: str = Header(default=""), db: Session = Depends(get_db)):
    # EventSource cannot set headers, so a ?token= fallback is accepted on this read-only stream only
    user = current_user(authorization=f"Bearer {token}" if token else authorization, db=db)
    _owned_task(db, task_id, user)
    async def gen():
        cursor = after
        for _ in range(300):  # ~5 min max, client reconnects with cursor
            evs = db.query(M.ExecutionEvent).filter(M.ExecutionEvent.task_id==task_id, M.ExecutionEvent.sequence_number>cursor).order_by(M.ExecutionEvent.sequence_number).all()
            for e in evs:
                cursor = e.sequence_number
                yield f"id: {e.sequence_number}\nevent: {e.event_type}\ndata: {json.dumps({'sequence': e.sequence_number, 'type': e.event_type, 'payload': e.sanitized_payload})}\n\n"
            db.expire_all()
            t = db.get(M.AgentTask, task_id)
            if t and t.status in ("completed","failed","cancelled"): break
            yield ": keepalive\n\n"; await asyncio.sleep(1)
    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})

# --- approvals ---
def approval_out(a): return {"id": a.id, "task_id": a.task_id, "tool": a.tool_name, "risk_level": a.risk_level,
    "status": a.approval_status, "proposed_action": a.proposed_action, "argument_hash": a.argument_hash,
    "expires_at": str(a.expires_at), "created_at": str(a.created_at)}
@app.get("/api/v1/approvals")
def list_approvals(status: str = "pending", user=Depends(current_user), db: Session = Depends(get_db)):
    ws_ids = [m.workspace_id for m in db.query(M.WorkspaceMember).filter_by(user_id=user.id)]
    q = db.query(M.ApprovalRequest).filter(M.ApprovalRequest.workspace_id.in_(ws_ids or [""]))
    if status != "all": q = q.filter_by(approval_status=status)
    return [approval_out(a) for a in q.order_by(M.ApprovalRequest.created_at.desc())]

@app.get("/api/v1/approvals/{approval_id}")
def get_approval(approval_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    a = db.get(M.ApprovalRequest, approval_id)
    if not a: raise HTTPException(404, "Approval not found")
    require_workspace(db, a.workspace_id, user.id); return approval_out(a)

@app.post("/api/v1/approvals/{approval_id}/approve")
def approve(approval_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    a = db.get(M.ApprovalRequest, approval_id)
    if not a: raise HTTPException(404, "Approval not found")
    require_workspace(db, a.workspace_id, user.id, "member")
    try: t = decide_approval(db, user, a, True)
    except ValueError as e: raise HTTPException(409, str(e))
    return {"approval": approval_out(a), "task": task_out(t)}

@app.post("/api/v1/approvals/{approval_id}/reject")
def reject(approval_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    a = db.get(M.ApprovalRequest, approval_id)
    if not a: raise HTTPException(404, "Approval not found")
    require_workspace(db, a.workspace_id, user.id, "member")
    try: t = decide_approval(db, user, a, False)
    except ValueError as e: raise HTTPException(409, str(e))
    return {"approval": approval_out(a), "task": task_out(t)}

# --- tools ---
@app.get("/api/v1/tools")
def list_tools(user=Depends(current_user)):
    return [{"name": t.name, "version": t.version, "description": t.description, "risk_level": t.risk_level,
             "side_effect": t.side_effect, "required_scopes": t.required_scopes, "verification": t.verification,
             "input_schema": t.schema(), "available": True} for t in REGISTRY.values()]

@app.get("/api/v1/tools/{tool_name}")
def get_tool(tool_name: str, user=Depends(current_user)):
    t = REGISTRY.get(tool_name)
    if not t: raise HTTPException(404, "Tool not registered")
    return {"name": t.name, "version": t.version, "description": t.description, "risk_level": t.risk_level,
            "required_scopes": t.required_scopes, "input_schema": t.schema()}

# --- memory ---
SENSITIVE = ("password", "api_key", "apikey", "secret", "token", "private_key")
@app.get("/api/v1/memory")
def list_mem(workspace_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    require_workspace(db, workspace_id, user.id)
    return [{"id": m.id, "content": m.content, "memory_type": m.memory_type, "source": m.source_reference,
             "user_approved": m.user_approved, "created_at": str(m.created_at)}
            for m in db.query(M.MemoryItem).filter_by(workspace_id=workspace_id)]

@app.post("/api/v1/memory")
def create_mem(body: MemIn, user=Depends(current_user), db: Session = Depends(get_db)):
    require_workspace(db, body.workspace_id, user.id, "member")
    if any(s in body.content.lower() for s in SENSITIVE): raise HTTPException(422, "Sensitive credential-like content must not be stored as memory")
    m = M.MemoryItem(workspace_id=body.workspace_id, owner_id=user.id, content=body.content,
                     memory_type=body.memory_type, source_reference=body.source_reference)
    db.add(m); db.commit(); return {"id": m.id}

@app.patch("/api/v1/memory/{memory_id}")
def patch_mem(memory_id: str, body: dict, user=Depends(current_user), db: Session = Depends(get_db)):
    m = db.get(M.MemoryItem, memory_id)
    if not m: raise HTTPException(404, "Memory not found")
    require_workspace(db, m.workspace_id, user.id, "member")
    if "content" in body: m.content = str(body["content"])
    db.commit(); return {"id": m.id, "content": m.content}

@app.delete("/api/v1/memory/{memory_id}")
def delete_mem(memory_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    m = db.get(M.MemoryItem, memory_id)
    if not m: raise HTTPException(404, "Memory not found")
    require_workspace(db, m.workspace_id, user.id, "member"); db.delete(m); db.commit(); return {"deleted": True}

# --- artifacts / usage ---
@app.get("/api/v1/artifacts")
def list_artifacts(workspace_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    require_workspace(db, workspace_id, user.id)
    out = []
    for a in db.query(M.Artifact).filter_by(workspace_id=workspace_id).order_by(M.Artifact.created_at.desc()):
        d = db.get(M.WorkspaceDocument, a.storage_reference.split(":",1)[1]) if a.storage_reference.startswith("workspace_documents:") else None
        out.append({"id": a.id, "title": a.title, "type": a.artifact_type, "hash": a.content_hash, "content": d.content if d else None, "created_at": str(a.created_at)})
    return out

@app.get("/api/v1/artifacts/{artifact_id}")
def get_artifact(artifact_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    a = db.get(M.Artifact, artifact_id)
    if not a: raise HTTPException(404, "Artifact not found")
    require_workspace(db, a.workspace_id, user.id); return {"id": a.id, "title": a.title, "hash": a.content_hash}

@app.post("/api/v1/artifacts/{artifact_id}/export")
def export_artifact(artifact_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    a = db.get(M.Artifact, artifact_id)
    if not a: raise HTTPException(404, "Artifact not found")
    require_workspace(db, a.workspace_id, user.id)
    d = db.get(M.WorkspaceDocument, a.storage_reference.split(":",1)[1])
    return {"filename": f"{a.title}.md", "content": d.content if d else "", "content_hash": a.content_hash,
            "hash_verified": bool(d and hashlib.sha256(d.content.encode()).hexdigest() == a.content_hash)}

@app.get("/api/v1/usage/overview")
def usage(user=Depends(current_user), db: Session = Depends(get_db)):
    recs = db.query(M.UsageRecord).filter_by(user_id=user.id).all()
    tasks = db.query(M.AgentTask).filter_by(user_id=user.id).all()
    from collections import Counter
    return {"tasks_total": len(tasks), "tasks_by_status": dict(Counter(t.status for t in tasks)),
            "model_calls": len(recs), "input_tokens": sum(r.input_tokens for r in recs),
            "output_tokens": sum(r.output_tokens for r in recs), "provider": "mock"}

FRONTEND = os.path.join(os.path.dirname(__file__), "..", "..", "frontend")
if os.path.isdir(FRONTEND): app.mount("/", StaticFiles(directory=FRONTEND, html=True), name="frontend")
