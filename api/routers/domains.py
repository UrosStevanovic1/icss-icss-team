from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas, auth
from ..permissions import role_of, is_admin_or_pm, require_admin_or_pm

router = APIRouter(prefix="/domains", tags=["domains"])


def _normalize(name: str) -> str:
    n = (name or "").strip()
    if not n:
        raise HTTPException(status_code=400, detail="Domain name cannot be empty.")
    return n



@router.get("/", response_model=List[schemas.DomainResponse])
def list_domains(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # allow admin/pm/hosp/lecturer to read domain labels
    r = role_of(current_user)
    if not (r in {"hosp", "lecturer"} or is_admin_or_pm(current_user)):
        raise HTTPException(status_code=403, detail="Not allowed")

    return db.query(models.Domain).order_by(models.Domain.name.asc()).all()


@router.post("/", response_model=schemas.DomainResponse)
def create_domain(
    p: schemas.DomainCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # ✅ any authenticated user can create a domain
    name = (p.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Domain name cannot be empty.")

    existing = db.query(models.Domain).filter(models.Domain.name == name).first()
    if existing:
        return existing

    row = models.Domain(name=name)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
