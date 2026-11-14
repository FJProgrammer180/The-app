import hashlib, secrets
from datetime import datetime, timedelta, timezone
import bcrypt
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from .db import get_db
from .models import User, AuthSession

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode()[:72], bcrypt.gensalt()).decode()
def check_pw(pw: str, h: str) -> bool:
    try: return bcrypt.checkpw(pw.encode()[:72], h.encode())
    except Exception: return False
def _th(token: str) -> str: return hashlib.sha256(token.encode()).hexdigest()

def issue_token(db: Session, user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    db.add(AuthSession(user_id=user_id, token_hash=_th(token),
                       expires_at=datetime.now(timezone.utc)+timedelta(hours=24)))
    db.commit()
    return token

def current_user(authorization: str = Header(default=""), db: Session = Depends(get_db)) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentication required")
    s = db.query(AuthSession).filter_by(token_hash=_th(authorization[7:]), revoked=False).first()
    if not s: raise HTTPException(401, "Invalid session")
    exp = s.expires_at
    if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc): raise HTTPException(401, "Session expired")
    u = db.get(User, s.user_id)
    if not u: raise HTTPException(401, "User not found")
    return u

def revoke(authorization: str, db: Session):
    if authorization.startswith("Bearer "):
        s = db.query(AuthSession).filter_by(token_hash=_th(authorization[7:])).first()
        if s: s.revoked = True; db.commit()
