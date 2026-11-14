# ATLAS OS — From Intent to Verified Execution
Autonomous personal work intelligence platform: natural-language goal → validated structured plan →
server-side policy check → registered tool execution → human approval for Risk-2 → read-after-write verification → persisted artifact + SSE event evidence.

## Run
```bash
python3 -m venv atlas-os/.venv && atlas-os/.venv/bin/pip install -r atlas-os/backend/requirements.txt
ATLAS_EMAIL_PROVIDER=mock sh atlas-os/run.sh   # http://localhost:8000
```
Tests: `cd atlas-os/backend && ../.venv/bin/python -m pytest tests/ -q` (6 tests: vertical slice, approval reject/approve-once, isolation, policy/cycle validation, safe calculator, memory/cancel).

## Architecture
- **Backend** FastAPI + SQLAlchemy (`backend/app/`): `models.py` (all spec entities + documents/internal tasks/outbox), `security.py` (bcrypt + expiring opaque sessions, login rate-limit), `policy.py` (role/scope/risk policy — model can never self-authorize), `registry.py` (13 typed tools, Pydantic schemas, risk levels; Risk-2 tools only registered when their integration env is configured), `planner.py` (deterministic labelled mock planner + strict plan validation: unknown tools, cycles, ≤20 steps), `orchestrator.py` (single persisted state machine, dependency resolution via `$step.field` refs, idempotency keys, bounded execution, approval pause/resume, verification events).
- **Frontend** terminal-style SPA served by FastAPI (`frontend/`): Landing, Mission Control, Agent Workspace (composer + plan/execution inspector + SSE), Approval Center (exact args + hash + expiry), Tool Registry, Memory Vault, Artifacts, Activity Logs, Settings. All data from real APIs.
- **Approvals**: bound to user/workspace/task/tool-execution + canonical argument hash, 15-min expiry, single-use (consumed/rejected/expired/invalidated), revalidated immediately before the single execution.
- **Security**: workspace membership on every resource, cross-workspace 403, AST-whitelisted calculator (no code execution), no shell tool exists, credential-like memory rejected, secrets never leave server.

## Limitations / next
SQLite default (Postgres via DATABASE_URL; Alembic scaffold pending), mock LLM planner (provider adapter interface in planner.py — wire ATLAS_LLM_* to a real provider), mock email outbox only, sequential execution, SSE with cursor recovery (poll `/events?after=` also works).
