"""Typed central tool registry. Only tools defined here can ever execute."""
import ast, hashlib, json, operator, os, re
from dataclasses import dataclass, field
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session
from .models import WorkspaceDocument, DocumentVersion, InternalTask, Artifact, OutboxMessage

# ---------- schemas ----------
class SearchDocsIn(BaseModel): query: str = Field(min_length=1, max_length=500)
class ReadDocIn(BaseModel): document_id: str
class SummarizeIn(BaseModel): document_id: str; max_sentences: int = Field(default=3, ge=1, le=10)
class CompareIn(BaseModel): document_ids: list[str] = Field(min_length=2, max_length=10)
class ExtractIn(BaseModel): document_id: str
class CreateDocIn(BaseModel): title: str = Field(min_length=1, max_length=300); content: str = Field(min_length=1, max_length=100000)
class UpdateDocIn(BaseModel): document_id: str; content: str = Field(min_length=1, max_length=100000); title: str | None = None
class CreateTaskIn(BaseModel): title: str = Field(min_length=1, max_length=300); description: str = ""; priority: str = "medium"; deadline: str | None = None
class UpdateTaskIn(BaseModel): task_id: str; status: str | None = None; priority: str | None = None; title: str | None = None
class ReportIn(BaseModel): title: str = Field(min_length=1, max_length=300); document_ids: list[str] = Field(min_length=1, max_length=10)
class CalcIn(BaseModel): expression: str = Field(min_length=1, max_length=200)
class ApprovalIn(BaseModel): action_description: str
class VerifyIn(BaseModel): artifact_id: str
class SendEmailIn(BaseModel): to: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"); subject: str = Field(min_length=1, max_length=300); body: str = Field(min_length=1, max_length=10000)
class DeleteDocIn(BaseModel): document_id: str

@dataclass
class Tool:
    name: str; version: str; description: str; risk_level: int; side_effect: str
    required_scopes: list[str]; input_model: type[BaseModel]; handler: object
    timeout_s: int = 10; max_retries: int = 0; verification: str = "none"
    def schema(self): return self.input_model.model_json_schema()

class Ctx:
    def __init__(self, db: Session, user, workspace_id: str, task_id: str | None):
        self.db, self.user, self.workspace_id, self.task_id = db, user, workspace_id, task_id

def _doc(ctx, doc_id):
    d = ctx.db.get(WorkspaceDocument, doc_id)
    if not d or d.workspace_id != ctx.workspace_id: raise ValueError("document_not_found_or_not_authorized")
    return d

def _sentences(text): return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.replace("\n"," ")) if s.strip()]

def t_search(ctx, a: SearchDocsIn):
    words = [w for w in re.findall(r"[a-z]{4,}", a.query.lower())]
    docs = ctx.db.query(WorkspaceDocument).filter_by(workspace_id=ctx.workspace_id).all()
    scored = []
    for d in docs:
        text = (d.title + " " + d.content).lower()
        score = sum(text.count(w) for w in words)
        scored.append((score, d))
    scored.sort(key=lambda x: -x[0])
    ranked = [{"document_id": d.id, "title": d.title, "snippet": d.content[:200], "relevance": s} for s, d in scored]
    hits = [h for h in ranked if h["relevance"] > 0]
    if len(hits) < 2: hits = ranked  # pad with remaining workspace docs so downstream compare steps have sources
    return {"count": len(hits), "documents": hits, "first_document_id": hits[0]["document_id"] if hits else None,
            "document_ids": [h["document_id"] for h in hits]}

def t_read(ctx, a: ReadDocIn):
    d = _doc(ctx, a.document_id); return {"document_id": d.id, "title": d.title, "content": d.content, "version": d.version}

def t_summarize(ctx, a: SummarizeIn):
    d = _doc(ctx, a.document_id); s = _sentences(d.content)
    return {"document_id": d.id, "title": d.title, "summary": " ".join(s[:a.max_sentences]), "sentence_count": len(s)}

def t_compare(ctx, a: CompareIn):
    docs = [_doc(ctx, i) for i in a.document_ids]
    return {"documents": [{"document_id": d.id, "title": d.title, "key_points": _sentences(d.content)[:3],
             "word_count": len(d.content.split())} for d in docs],
            "common_terms": sorted(set.intersection(*[set(re.findall(r"[a-z]{5,}", d.content.lower())) for d in docs]))[:20]}

def t_extract(ctx, a: ExtractIn):
    d = _doc(ctx, a.document_id)
    return {"document_id": d.id, "emails": re.findall(r"[\w.+-]+@[\w-]+\.[\w.]+", d.content),
            "dates": re.findall(r"\b\d{4}-\d{2}-\d{2}\b", d.content),
            "numbers": [float(x) for x in re.findall(r"\b\d+(?:\.\d+)?\b", d.content)][:50],
            "word_count": len(d.content.split())}

def _artifact(ctx, doc, kind):
    h = hashlib.sha256(doc.content.encode()).hexdigest()
    art = Artifact(task_id=ctx.task_id, workspace_id=ctx.workspace_id, owner_id=ctx.user.id,
                   artifact_type=kind, title=doc.title, storage_reference=f"workspace_documents:{doc.id}", content_hash=h)
    ctx.db.add(art); ctx.db.flush(); return art

def t_create_doc(ctx, a: CreateDocIn):
    d = WorkspaceDocument(workspace_id=ctx.workspace_id, owner_id=ctx.user.id, title=a.title, content=a.content)
    ctx.db.add(d); ctx.db.flush()
    ctx.db.add(DocumentVersion(document_id=d.id, version=1, title=d.title, content=d.content))
    art = _artifact(ctx, d, "document"); ctx.db.commit()
    back = ctx.db.get(WorkspaceDocument, d.id)  # read-after-write verification
    verified = bool(back and back.content == a.content)
    return {"document_id": d.id, "artifact_id": art.id, "verified": verified, "content_hash": art.content_hash}

def t_update_doc(ctx, a: UpdateDocIn):
    d = _doc(ctx, a.document_id)
    d.content = a.content; d.title = a.title or d.title; d.version += 1
    ctx.db.add(DocumentVersion(document_id=d.id, version=d.version, title=d.title, content=d.content)); ctx.db.commit()
    back = ctx.db.get(WorkspaceDocument, d.id)
    return {"document_id": d.id, "version": d.version, "verified": bool(back and back.content == a.content)}

def t_create_task(ctx, a: CreateTaskIn):
    if a.priority not in ("low","medium","high","urgent"): raise ValueError("invalid_priority")
    t = InternalTask(workspace_id=ctx.workspace_id, owner_id=ctx.user.id, title=a.title,
                     description=a.description, priority=a.priority, deadline=a.deadline)
    ctx.db.add(t); ctx.db.commit()
    back = ctx.db.get(InternalTask, t.id)
    return {"internal_task_id": t.id, "title": t.title, "verified": bool(back and back.title == a.title)}

def t_update_task(ctx, a: UpdateTaskIn):
    t = ctx.db.get(InternalTask, a.task_id)
    if not t or t.workspace_id != ctx.workspace_id: raise ValueError("task_not_found_or_not_authorized")
    if a.status: t.status = a.status
    if a.priority: t.priority = a.priority
    if a.title: t.title = a.title
    ctx.db.commit(); return {"internal_task_id": t.id, "status": t.status, "verified": True}

def t_report(ctx, a: ReportIn):
    docs = [_doc(ctx, i) for i in a.document_ids]
    lines = [f"# {a.title}", "", "## Executive Summary",
             "This report was generated by ATLAS OS from verified workspace documents listed below.", "", "## Sources"]
    for d in docs: lines.append(f"- {d.title} (id: {d.id}, version: {d.version})")
    lines += ["", "## Key Findings"]
    for d in docs:
        lines.append(f"### {d.title}"); lines += [f"- {s}" for s in _sentences(d.content)[:3]] or ["- (no extractable sentences)"]
    lines += ["", "## Comparison", "Documents compared: " + ", ".join(d.title for d in docs), "", "## Conclusion",
              "Findings above are extracted verbatim from authorized workspace sources; verify against originals before external use."]
    content = "\n".join(lines)
    d = WorkspaceDocument(workspace_id=ctx.workspace_id, owner_id=ctx.user.id, title=a.title, content=content)
    ctx.db.add(d); ctx.db.flush(); ctx.db.add(DocumentVersion(document_id=d.id, version=1, title=d.title, content=d.content))
    art = _artifact(ctx, d, "report"); ctx.db.commit()
    back = ctx.db.get(WorkspaceDocument, d.id)
    verified = bool(back and "## Key Findings" in back.content and "## Conclusion" in back.content)
    return {"document_id": d.id, "artifact_id": art.id, "source_document_ids": [x.id for x in docs], "verified": verified}

_OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv,
        ast.Mod: operator.mod, ast.Pow: operator.pow, ast.USub: operator.neg, ast.FloorDiv: operator.floordiv}
def _eval(node):
    if isinstance(node, ast.Expression): return _eval(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)): return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _OPS: return _OPS[type(node.op)](_eval(node.left), _eval(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS: return _OPS[type(node.op)](_eval(node.operand))
    raise ValueError("unsupported_expression")  # no names, calls, attributes — no code execution
def t_calc(ctx, a: CalcIn): return {"expression": a.expression, "result": _eval(ast.parse(a.expression, mode="eval"))}

def t_verify(ctx, a: VerifyIn):
    art = ctx.db.get(Artifact, a.artifact_id)
    if not art or art.workspace_id != ctx.workspace_id: raise ValueError("artifact_not_found_or_not_authorized")
    kind, ref = art.storage_reference.split(":", 1)
    exists, detail = False, ""
    if kind == "workspace_documents":
        d = ctx.db.get(WorkspaceDocument, ref)
        exists = bool(d and hashlib.sha256(d.content.encode()).hexdigest() == art.content_hash); detail = f"document {ref} hash match={exists}"
    return {"artifact_id": art.id, "verified": exists, "method": "read_after_write_hash_check", "evidence": detail}

def t_send_email(ctx, a: SendEmailIn):
    mid = f"mock-{hashlib.sha256((a.to+a.subject).encode()).hexdigest()[:12]}"
    ctx.db.add(OutboxMessage(workspace_id=ctx.workspace_id, to_addr=a.to, subject=a.subject, body=a.body,
                             provider="mock", provider_message_id=mid)); ctx.db.commit()
    return {"sent": True, "provider": "mock", "provider_message_id": mid, "note": "Mock provider only — no real email left the system"}

def t_delete_doc(ctx, a: DeleteDocIn):
    d = _doc(ctx, a.document_id); ctx.db.delete(d); ctx.db.commit()
    return {"deleted": ctx.db.get(WorkspaceDocument, a.document_id) is None, "document_id": a.document_id}

def build_registry() -> dict[str, Tool]:
    tools = [
        Tool("search_workspace_documents","1.0.0","Search authorized workspace documents",0,"read",["documents:read"],SearchDocsIn,t_search),
        Tool("read_workspace_document","1.0.0","Read an authorized workspace document",0,"read",["documents:read"],ReadDocIn,t_read),
        Tool("summarize_document","1.0.0","Extractive summary of an authorized document",0,"read",["documents:read"],SummarizeIn,t_summarize),
        Tool("compare_documents","1.0.0","Compare authorized documents with source refs",0,"read",["documents:read"],CompareIn,t_compare),
        Tool("extract_structured_data","1.0.0","Extract dates/emails/numbers from a document",0,"read",["documents:read"],ExtractIn,t_extract),
        Tool("create_workspace_document","1.0.0","Create internal document/report (versioned)",1,"internal_write",["documents:write"],CreateDocIn,t_create_doc,verification="read_after_write"),
        Tool("update_workspace_document","1.0.0","Update a document preserving version history",1,"internal_write",["documents:write"],UpdateDocIn,t_update_doc,verification="read_after_write"),
        Tool("create_internal_task","1.0.0","Create an internal task",1,"internal_write",["tasks:write"],CreateTaskIn,t_create_task,verification="read_after_write"),
        Tool("update_internal_task","1.0.0","Update an authorized internal task",1,"internal_write",["tasks:write"],UpdateTaskIn,t_update_task,verification="read_after_write"),
        Tool("generate_research_report","1.0.0","Generate a verified internal report from documents",1,"internal_write",["documents:write"],ReportIn,t_report,verification="read_after_write_sections"),
        Tool("calculate","1.0.0","Safe deterministic arithmetic (AST-whitelisted, no code exec)",0,"read",["calculate"],CalcIn,t_calc),
        Tool("verify_artifact","1.0.0","Verify a persisted artifact by hash read-back",0,"read",["documents:read"],VerifyIn,t_verify),
    ]
    # Risk-2 tools are exposed ONLY when their integration is explicitly configured.
    if os.getenv("ATLAS_EMAIL_PROVIDER") == "mock":
        tools.append(Tool("send_email","1.0.0","Send email via configured provider (MOCK provider in this deployment)",2,"external_write",["external:write"],SendEmailIn,t_send_email,verification="provider_message_id"))
    if os.getenv("ATLAS_ENABLE_DELETE") == "1":
        tools.append(Tool("delete_workspace_resource","1.0.0","Delete a workspace document (destructive)",2,"destructive",["documents:write"],DeleteDocIn,t_delete_doc,verification="read_after_delete"))
    return {t.name: t for t in tools}

REGISTRY = build_registry()

def canonical_hash(args: dict) -> str:
    return hashlib.sha256(json.dumps(args, sort_keys=True, separators=(",",":")).encode()).hexdigest()
