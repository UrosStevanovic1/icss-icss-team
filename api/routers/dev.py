# api/routers/dev.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from .. import models, auth

router = APIRouter(tags=["dev"])

@router.get("/seed")
def seed_users(db: Session = Depends(get_db)):
    log = []

    def ensure_user(email: str, role: str, lecturer_id: Optional[int] = None):
        if not db.query(models.User).filter(models.User.email == email).first():
            hashed = auth.get_password_hash("password")
            db.add(models.User(email=email, password_hash=hashed, role=role, lecturer_id=lecturer_id))
            log.append(f"✅ Created {role} user: {email}")

    ensure_user("pm@icss.com", "pm", None)
    ensure_user("hosp@icss.com", "hosp", 1)
    ensure_user("lecturer@icss.com", "lecturer", 2)  # adjust if needed
    ensure_user("student@icss.com", "student", None)

    db.commit()
    return {"status": "Complete", "changes": log}
