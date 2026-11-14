"""Server-side policy engine. The model can never override these checks."""
from fastapi import HTTPException
from sqlalchemy.orm import Session
from .models import WorkspaceMember

ROLE_RANK = {"viewer": 0, "member": 1, "admin": 2, "owner": 3}
# permission scope -> minimum role
SCOPE_ROLE = {"workspace:read": "viewer", "documents:read": "viewer", "documents:write": "member",
              "tasks:read": "viewer", "tasks:write": "member", "memory:read": "viewer",
              "memory:write": "member", "external:write": "member", "calculate": "viewer", "approval:request": "member"}

def membership(db: Session, workspace_id: str, user_id: str):
    return db.query(WorkspaceMember).filter_by(workspace_id=workspace_id, user_id=user_id).first()

def require_workspace(db: Session, workspace_id: str, user_id: str, min_role="viewer"):
    m = membership(db, workspace_id, user_id)
    if not m: raise HTTPException(403, "Not a member of this workspace")
    if ROLE_RANK[m.role] < ROLE_RANK[min_role]: raise HTTPException(403, "Insufficient workspace role")
    return m

def authorize_tool(db, user, workspace_id, tool, autonomy_policy: str):
    """Returns (allowed: bool, needs_approval: bool, reason: str)."""
    m = membership(db, workspace_id, user.id)
    if not m: return False, False, "not_workspace_member"
    for scope in tool.required_scopes:
        need = SCOPE_ROLE.get(scope, "member")
        if ROLE_RANK[m.role] < ROLE_RANK[need]:
            return False, False, f"missing_scope:{scope}"
    if tool.risk_level >= 3: return False, False, "risk_level_3_unsupported"
    if tool.risk_level == 2: return True, True, "risk2_requires_approval"
    if tool.risk_level == 1 and autonomy_policy == "read_only":
        return True, True, "read_only_policy_requires_approval_for_writes"
    return True, False, "ok"
