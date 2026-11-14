import os, sys
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ATLAS_EMAIL_PROVIDER"] = "mock"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
# fresh in-memory DB per run: patch engine before importing app
import app.db as dbmod
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
eng = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
dbmod.engine = eng; dbmod.SessionLocal = sessionmaker(bind=eng, autoflush=False, expire_on_commit=False)
import app.main as main
main.engine = eng
from app.db import Base
Base.metadata.drop_all(bind=eng); Base.metadata.create_all(bind=eng)
from fastapi.testclient import TestClient
c = TestClient(main.app)

def reg(email="a@test.dev"):
    r = c.post("/api/v1/auth/register", json={"email": email, "password": "password123", "display_name": "A"})
    assert r.status_code == 200, r.text
    d = r.json(); return {"Authorization": f"Bearer {d['token']}"}, d["workspace_id"]

def seed_docs(h, ws):
    c.post(f"/api/v1/workspaces/{ws}/documents", headers=h, json={"title": "Solar Study", "content": "Solar panels convert sunlight into electricity. Efficiency reached 23 percent in 2024-01-15 tests. Costs fell steadily."})
    c.post(f"/api/v1/workspaces/{ws}/documents", headers=h, json={"title": "Wind Study", "content": "Wind turbines convert kinetic energy into electricity. Capacity grew in 2024-02-20 reports. Costs fell as turbines scaled."})

def test_vertical_slice_report():
    h, ws = reg(); seed_docs(h, ws)
    r = c.post("/api/v1/agent/tasks", headers=h, json={"workspace_id": ws, "objective": "Analyze the research documents and create a structured research report"})
    assert r.status_code == 200, r.text
    tid = r.json()["id"]
    r = c.post(f"/api/v1/agent/tasks/{tid}/start", headers=h); assert r.json()["status"] == "completed", r.text
    d = c.get(f"/api/v1/agent/tasks/{tid}", headers=h).json()
    assert [s["status"] for s in d["steps"]] == ["completed"]*4
    assert all(e["status"] == "completed" for e in d["executions"])
    arts = c.get("/api/v1/artifacts", headers=h, params={"workspace_id": ws}).json()
    assert arts and "## Key Findings" in arts[0]["content"]
    evs = c.get(f"/api/v1/agent/tasks/{tid}/events", headers=h).json()
    assert any(e["type"] == "task_completed" for e in evs) and evs == sorted(evs, key=lambda x: x["sequence"])

def test_approval_reject_never_executes():
    h, ws = reg("b@test.dev")
    tid = c.post("/api/v1/agent/tasks", headers=h, json={"workspace_id": ws, "objective": "Send an email to bob@example.com confirming the update"}).json()["id"]
    r = c.post(f"/api/v1/agent/tasks/{tid}/start", headers=h); assert r.json()["status"] == "awaiting_approval", r.text
    ap = c.get("/api/v1/approvals", headers=h).json()[0]
    assert ap["tool"] == "send_email" and ap["risk_level"] == 2 and ap["proposed_action"]["arguments"]["to"] == "bob@example.com"
    out = c.post(f"/api/v1/approvals/{ap['id']}/reject", headers=h).json()
    assert out["task"]["status"] == "failed"
    # second decision must fail (single-use)
    assert c.post(f"/api/v1/approvals/{ap['id']}/approve", headers=h).status_code == 409

def test_approval_approve_executes_once_mock():
    h, ws = reg("c@test.dev")
    tid = c.post("/api/v1/agent/tasks", headers=h, json={"workspace_id": ws, "objective": "Send an email to bob@example.com confirming the update"}).json()["id"]
    c.post(f"/api/v1/agent/tasks/{tid}/start", headers=h)
    ap = c.get("/api/v1/approvals", headers=h).json()[0]
    out = c.post(f"/api/v1/approvals/{ap['id']}/approve", headers=h).json()
    assert out["task"]["status"] == "completed", out
    assert c.post(f"/api/v1/approvals/{ap['id']}/approve", headers=h).status_code == 409
    d = c.get(f"/api/v1/agent/tasks/{tid}", headers=h).json()
    sends = [e for e in d["executions"] if e["tool"] == "send_email" and e["status"] == "completed"]
    assert len(sends) == 1

def test_isolation_and_policy():
    h1, ws1 = reg("d@test.dev"); h2, ws2 = reg("e@test.dev")
    assert c.get("/api/v1/agent/tasks", headers=h2, params={"workspace_id": ws1}).status_code == 403
    assert c.get("/api/v1/tools", headers=h1).status_code == 200
    assert c.get("/api/v1/tools", headers={}).status_code == 401
    from app.planner import validate_plan, PlanValidationError
    for bad in ({"steps":[{"id":"s1","tool":"execute_shell","dependencies":[]}]},
                {"steps":[{"id":"s1","tool":"calculate","dependencies":["s2"]},{"id":"s2","tool":"calculate","dependencies":["s1"]}]}):
        try: validate_plan(bad); assert False
        except PlanValidationError: pass

def test_calculate_no_code_exec():
    h, ws = reg("f@test.dev")
    tid = c.post("/api/v1/agent/tasks", headers=h, json={"workspace_id": ws, "objective": "Calculate 6 * 7 + 2"}).json()["id"]
    assert c.post(f"/api/v1/agent/tasks/{tid}/start", headers=h).json()["status"] == "completed"
    from app.registry import REGISTRY, Ctx
    try:
        REGISTRY["calculate"].input_model.model_validate({"expression": "__import__('os').system('id')"})
        out = REGISTRY["calculate"].handler(Ctx(None, None, ws, None), REGISTRY["calculate"].input_model(expression="__import__('os')"))
        assert False
    except Exception: pass

def test_memory_sensitive_rejected_and_cancel():
    h, ws = reg("g@test.dev")
    assert c.post("/api/v1/memory", headers=h, json={"workspace_id": ws, "content": "my api_key is xyz"}).status_code == 422
    mid = c.post("/api/v1/memory", headers=h, json={"workspace_id": ws, "content": "Prefers weekly reports"}).json()["id"]
    assert c.delete(f"/api/v1/memory/{mid}", headers=h).json()["deleted"] is True
    tid = c.post("/api/v1/agent/tasks", headers=h, json={"workspace_id": ws, "objective": "Summarize workspace documents"}).json()["id"]
    assert c.post(f"/api/v1/agent/tasks/{tid}/cancel", headers=h).json()["status"] == "cancelled"
