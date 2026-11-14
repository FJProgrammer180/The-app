"""Planning engine. Provider-independent: deterministic mock provider by default
(clearly labelled, never presented as a real LLM). A real provider can be plugged
in via ATLAS_LLM_* env; plans are validated identically either way."""
import re
from .registry import REGISTRY

MAX_STEPS = 20

class PlanValidationError(ValueError): pass

def validate_plan(plan: dict) -> dict:
    steps = plan.get("steps", [])
    if not steps: raise PlanValidationError("plan_has_no_steps")
    if len(steps) > MAX_STEPS: raise PlanValidationError("too_many_steps")
    ids = set()
    for s in steps:
        if s["id"] in ids: raise PlanValidationError("duplicate_step_id")
        ids.add(s["id"])
        if s["tool"] not in REGISTRY: raise PlanValidationError(f"unknown_tool:{s['tool']}")
        for d in s.get("dependencies", []):
            if d not in ids and d not in {x["id"] for x in steps}: raise PlanValidationError(f"unknown_dependency:{d}")
    # cycle check (Kahn)
    graph = {s["id"]: list(s.get("dependencies", [])) for s in steps}
    done = set(); progress = True
    while progress:
        progress = False
        for k, deps in graph.items():
            if k not in done and all(d in done for d in deps): done.add(k); progress = True
    if len(done) != len(graph): raise PlanValidationError("dependency_cycle")
    return plan

class MockPlanner:
    name = "mock"; model = "deterministic-mock-1"
    def plan(self, objective: str) -> dict:
        o = objective.lower()
        def step(i, tool, purpose, deps=None, args=None, expected=""):
            return {"id": f"step_{i}", "tool": tool, "purpose": purpose, "dependencies": deps or [],
                    "arguments": args or {}, "expected_output": expected}
        email = re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", objective)
        if ("email" in o or "send" in o) and email and "send_email" in REGISTRY:
            return {"objective": objective, "provider": self.name, "steps": [
                step(1, "send_email", "Send the requested email (Risk 2 — approval required)", args={
                    "to": email.group(0), "subject": "Message from ATLAS OS",
                    "body": objective}, expected="Provider message id")]}
        if "calculate" in o or re.search(r"\d+\s*[-+*/]\s*\d+", o):
            expr = re.search(r"[\d\s\.\+\-\*/\(\)%]+", objective.replace("calculate","",1))
            return {"objective": objective, "provider": self.name, "steps": [
                step(1, "calculate", "Perform the requested calculation", args={"expression": (expr.group(0).strip() if expr else "0")})]}
        if any(k in o for k in ("priority", "priorit", "organize my", "weekly plan", "unfinished tasks", "to-do", "todo")) and "task" in o:
            return {"objective": objective, "provider": self.name, "steps": [
                step(1, "create_internal_task", "Create the organizing internal task", args={
                    "title": objective[:120], "description": objective, "priority": "high"}, expected="Persisted internal task")]}
        if any(k in o for k in ("report", "research", "compare", "analy")):
            return {"objective": objective, "provider": self.name, "steps": [
                step(1, "search_workspace_documents", "Find relevant workspace documents", args={"query": objective[:120]}, expected="Document references"),
                step(2, "compare_documents", "Compare findings across documents", ["step_1"], {"document_ids": "$step_1.document_ids"}, "Evidence-based comparison"),
                step(3, "generate_research_report", "Create the structured research report", ["step_2"],
                     {"title": "Research Report", "document_ids": "$step_1.document_ids"}, "Persisted report artifact"),
                step(4, "verify_artifact", "Verify the report artifact was saved", ["step_3"], {"artifact_id": "$step_3.artifact_id"}, "Hash-verified artifact")]}
        # default: search -> summarize -> save internal document
        return {"objective": objective, "provider": self.name, "steps": [
            step(1, "search_workspace_documents", "Find relevant workspace documents", args={"query": objective[:120]}, expected="Document references"),
            step(2, "summarize_document", "Summarize the top matching document", ["step_1"], {"document_id": "$step_1.first_document_id"}, "Summary"),
            step(3, "create_workspace_document", "Save the result as an internal document", ["step_2"],
                 {"title": f"Result: {objective[:60]}", "content": "$step_2.summary"}, "Persisted document artifact"),
            step(4, "verify_artifact", "Verify the saved artifact", ["step_3"], {"artifact_id": "$step_3.artifact_id"}, "Hash-verified artifact")]}

def get_planner(): return MockPlanner()
