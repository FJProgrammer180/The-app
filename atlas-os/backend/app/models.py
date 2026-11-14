import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Boolean, Float, ForeignKey, UniqueConstraint, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

def uid(): return str(uuid.uuid4())
def now(): return datetime.now(timezone.utc)

class User(Base):
    __tablename__="users"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    email:Mapped[str]=mapped_column(String(320),unique=True,index=True)
    password_hash:Mapped[str]=mapped_column(String(255))
    display_name:Mapped[str]=mapped_column(String(120),default="")
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)

class AuthSession(Base):
    __tablename__="auth_sessions"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    user_id:Mapped[str]=mapped_column(ForeignKey("users.id"),index=True)
    token_hash:Mapped[str]=mapped_column(String(64),unique=True,index=True)
    expires_at:Mapped[datetime]=mapped_column(DateTime(timezone=True))
    revoked:Mapped[bool]=mapped_column(Boolean,default=False)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class Workspace(Base):
    __tablename__="workspaces"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    owner_id:Mapped[str]=mapped_column(ForeignKey("users.id"),index=True)
    name:Mapped[str]=mapped_column(String(160))
    description:Mapped[str]=mapped_column(Text,default="")
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class WorkspaceMember(Base):
    __tablename__="workspace_members"
    __table_args__=(UniqueConstraint("workspace_id","user_id"),)
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    workspace_id:Mapped[str]=mapped_column(ForeignKey("workspaces.id"),index=True)
    user_id:Mapped[str]=mapped_column(ForeignKey("users.id"),index=True)
    role:Mapped[str]=mapped_column(String(30),default="member")  # owner|admin|member|viewer
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class WorkspaceDocument(Base):
    __tablename__="workspace_documents"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    workspace_id:Mapped[str]=mapped_column(ForeignKey("workspaces.id"),index=True)
    owner_id:Mapped[str]=mapped_column(ForeignKey("users.id"))
    title:Mapped[str]=mapped_column(String(300))
    content:Mapped[str]=mapped_column(Text,default="")
    version:Mapped[int]=mapped_column(Integer,default=1)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)

class DocumentVersion(Base):
    __tablename__="document_versions"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    document_id:Mapped[str]=mapped_column(ForeignKey("workspace_documents.id"),index=True)
    version:Mapped[int]=mapped_column(Integer)
    title:Mapped[str]=mapped_column(String(300)); content:Mapped[str]=mapped_column(Text)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class InternalTask(Base):
    __tablename__="internal_tasks"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    workspace_id:Mapped[str]=mapped_column(ForeignKey("workspaces.id"),index=True)
    owner_id:Mapped[str]=mapped_column(ForeignKey("users.id"))
    title:Mapped[str]=mapped_column(String(300)); description:Mapped[str]=mapped_column(Text,default="")
    priority:Mapped[str]=mapped_column(String(20),default="medium"); status:Mapped[str]=mapped_column(String(20),default="open")
    deadline:Mapped[str]=mapped_column(String(40),nullable=True)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)

class AgentSession(Base):
    __tablename__="agent_sessions"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    workspace_id:Mapped[str]=mapped_column(ForeignKey("workspaces.id"),index=True)
    user_id:Mapped[str]=mapped_column(ForeignKey("users.id"),index=True)
    title:Mapped[str]=mapped_column(String(300),default="Session"); status:Mapped[str]=mapped_column(String(30),default="active")
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)

class AgentMessage(Base):
    __tablename__="agent_messages"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    session_id:Mapped[str]=mapped_column(ForeignKey("agent_sessions.id"),index=True)
    role:Mapped[str]=mapped_column(String(20)); content:Mapped[str]=mapped_column(Text)
    meta:Mapped[dict]=mapped_column(JSON,default=dict)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class AgentTask(Base):
    __tablename__="agent_tasks"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    session_id:Mapped[str]=mapped_column(ForeignKey("agent_sessions.id"),nullable=True,index=True)
    workspace_id:Mapped[str]=mapped_column(ForeignKey("workspaces.id"),index=True)
    user_id:Mapped[str]=mapped_column(ForeignKey("users.id"),index=True,default="")
    objective:Mapped[str]=mapped_column(Text)
    status:Mapped[str]=mapped_column(String(30),default="queued",index=True)
    autonomy_policy:Mapped[str]=mapped_column(String(30),default="supervised") # read_only|supervised|autonomous_internal
    current_plan_version:Mapped[int]=mapped_column(Integer,default=0)
    summary:Mapped[str]=mapped_column(Text,default="")
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    started_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),nullable=True)
    completed_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),nullable=True)

class AgentPlan(Base):
    __tablename__="agent_plans"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    task_id:Mapped[str]=mapped_column(ForeignKey("agent_tasks.id"),index=True)
    version:Mapped[int]=mapped_column(Integer,default=1)
    plan_json:Mapped[dict]=mapped_column(JSON)
    validation_status:Mapped[str]=mapped_column(String(30),default="valid")
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class TaskStep(Base):
    __tablename__="task_steps"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    task_id:Mapped[str]=mapped_column(ForeignKey("agent_tasks.id"),index=True)
    plan_id:Mapped[str]=mapped_column(ForeignKey("agent_plans.id"))
    step_key:Mapped[str]=mapped_column(String(60)); tool_name:Mapped[str]=mapped_column(String(80))
    purpose:Mapped[str]=mapped_column(Text,default="")
    arguments:Mapped[dict]=mapped_column(JSON,default=dict)
    dependencies:Mapped[list]=mapped_column(JSON,default=list)
    status:Mapped[str]=mapped_column(String(30),default="pending") # pending|running|awaiting_approval|completed|failed|skipped|rejected
    expected_output:Mapped[str]=mapped_column(Text,default="")
    result_reference:Mapped[str]=mapped_column(Text,default="")
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    completed_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),nullable=True)

class ToolExecution(Base):
    __tablename__="tool_executions"
    __table_args__=(UniqueConstraint("idempotency_key"),)
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    task_id:Mapped[str]=mapped_column(ForeignKey("agent_tasks.id"),index=True)
    step_id:Mapped[str]=mapped_column(ForeignKey("task_steps.id"),index=True)
    tool_name:Mapped[str]=mapped_column(String(80)); tool_version:Mapped[str]=mapped_column(String(20),default="1.0.0")
    input_hash:Mapped[str]=mapped_column(String(64))
    sanitized_arguments:Mapped[dict]=mapped_column(JSON,default=dict)
    output_summary:Mapped[dict]=mapped_column(JSON,default=dict)
    output_data:Mapped[dict]=mapped_column(JSON,default=dict)
    execution_status:Mapped[str]=mapped_column(String(30),default="pending")
    duration_ms:Mapped[int]=mapped_column(Integer,nullable=True)
    error_category:Mapped[str]=mapped_column(String(80),nullable=True)
    idempotency_key:Mapped[str]=mapped_column(String(120))
    verification_status:Mapped[str]=mapped_column(String(30),nullable=True)
    verification_detail:Mapped[str]=mapped_column(Text,default="")
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    completed_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),nullable=True)

class ApprovalRequest(Base):
    __tablename__="approval_requests"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    task_id:Mapped[str]=mapped_column(ForeignKey("agent_tasks.id"),index=True)
    tool_execution_id:Mapped[str]=mapped_column(ForeignKey("tool_executions.id"),index=True)
    requester_id:Mapped[str]=mapped_column(ForeignKey("users.id")); workspace_id:Mapped[str]=mapped_column(ForeignKey("workspaces.id"),index=True)
    tool_name:Mapped[str]=mapped_column(String(80),default="")
    argument_hash:Mapped[str]=mapped_column(String(64)); risk_level:Mapped[int]=mapped_column(Integer,default=2)
    approval_status:Mapped[str]=mapped_column(String(30),default="pending",index=True) # pending|approved|rejected|expired|consumed|invalidated
    proposed_action:Mapped[dict]=mapped_column(JSON,default=dict)
    expires_at:Mapped[datetime]=mapped_column(DateTime(timezone=True))
    decided_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),nullable=True)
    decided_by:Mapped[str]=mapped_column(String(36),nullable=True)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class MemoryItem(Base):
    __tablename__="memory_items"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    workspace_id:Mapped[str]=mapped_column(ForeignKey("workspaces.id"),index=True)
    owner_id:Mapped[str]=mapped_column(ForeignKey("users.id"),index=True)
    memory_type:Mapped[str]=mapped_column(String(40),default="workspace") # preference|workspace|instruction
    content:Mapped[str]=mapped_column(Text); source_reference:Mapped[str]=mapped_column(String(300),default="")
    user_approved:Mapped[bool]=mapped_column(Boolean,default=True)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)

class Artifact(Base):
    __tablename__="artifacts"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    task_id:Mapped[str]=mapped_column(ForeignKey("agent_tasks.id"),nullable=True,index=True)
    workspace_id:Mapped[str]=mapped_column(ForeignKey("workspaces.id"),index=True)
    owner_id:Mapped[str]=mapped_column(ForeignKey("users.id"))
    artifact_type:Mapped[str]=mapped_column(String(40),default="document")
    title:Mapped[str]=mapped_column(String(300),default="")
    storage_reference:Mapped[str]=mapped_column(String(300)) # workspace_documents:<id>
    content_hash:Mapped[str]=mapped_column(String(64))
    meta:Mapped[dict]=mapped_column(JSON,default=dict)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class IntegrationConnection(Base):
    __tablename__="integration_connections"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    workspace_id:Mapped[str]=mapped_column(ForeignKey("workspaces.id"),index=True)
    provider:Mapped[str]=mapped_column(String(60)); encrypted_credentials:Mapped[str]=mapped_column(Text,default="")
    permissions:Mapped[list]=mapped_column(JSON,default=list); connection_status:Mapped[str]=mapped_column(String(30),default="disconnected")
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)

class OutboxMessage(Base):
    __tablename__="outbox_messages"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    workspace_id:Mapped[str]=mapped_column(String(36),index=True)
    to_addr:Mapped[str]=mapped_column(String(320)); subject:Mapped[str]=mapped_column(String(300)); body:Mapped[str]=mapped_column(Text)
    provider:Mapped[str]=mapped_column(String(40),default="mock"); provider_message_id:Mapped[str]=mapped_column(String(80),default="")
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class ExecutionEvent(Base):
    __tablename__="execution_events"
    __table_args__=(UniqueConstraint("task_id","sequence_number"),)
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    task_id:Mapped[str]=mapped_column(ForeignKey("agent_tasks.id"),index=True)
    event_type:Mapped[str]=mapped_column(String(50)); sanitized_payload:Mapped[dict]=mapped_column(JSON,default=dict)
    sequence_number:Mapped[int]=mapped_column(Integer)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class UsageRecord(Base):
    __tablename__="usage_records"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    user_id:Mapped[str]=mapped_column(String(36),index=True); task_id:Mapped[str]=mapped_column(String(36),nullable=True)
    provider:Mapped[str]=mapped_column(String(60),default="mock"); model:Mapped[str]=mapped_column(String(80),default="deterministic-mock-1")
    input_tokens:Mapped[int]=mapped_column(Integer,default=0); output_tokens:Mapped[int]=mapped_column(Integer,default=0)
    estimated_cost:Mapped[float]=mapped_column(Float,default=0.0)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
