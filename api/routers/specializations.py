# api/routers/specializations.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas, auth
from ..permissions import role_of, is_admin_or_pm, hosp_program_ids

router = APIRouter(prefix="/specializations", tags=["specializations"])

@router.get("/", response_model=List[schemas.SpecializationResponse])
def read_specializations(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Specialization).all()

@router.post("/", response_model=schemas.SpecializationResponse)
def create_specialization(p: schemas.SpecializationCreate, db: Session = Depends(get_db),
                          current_user: models.User = Depends(auth.get_current_user)):
    r = role_of(current_user)
    if is_admin_or_pm(current_user):
        pass
    elif r == "hosp":
        if p.program_id is None:
            raise HTTPException(status_code=400, detail="program_id is required")
        if p.program_id not in hosp_program_ids(db, current_user):
            raise HTTPException(status_code=403, detail="Unauthorized for this program")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    row = models.Specialization(**p.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.put("/{id}", response_model=schemas.SpecializationResponse)
def update_specialization(id: int, p: schemas.SpecializationUpdate, db: Session = Depends(get_db),
                          current_user: models.User = Depends(auth.get_current_user)):
    row = db.query(models.Specialization).filter(models.Specialization.id == id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Specialization not found")

    r = role_of(current_user)
    if is_admin_or_pm(current_user):
        pass
    elif r == "hosp":
        if row.program_id not in hosp_program_ids(db, current_user):
            raise HTTPException(status_code=403, detail="Unauthorized for this program")
        if p.program_id is not None and p.program_id not in hosp_program_ids(db, current_user):
            raise HTTPException(status_code=403, detail="Cannot move specialization to another program")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    data = p.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)

    db.commit()
    db.refresh(row)
    return row

@router.delete("/{id}")
def delete_specialization(id: int, db: Session = Depends(get_db),
                          current_user: models.User = Depends(auth.get_current_user)):
    row = db.query(models.Specialization).filter(models.Specialization.id == id).first()
    if not row:
        return {"ok": True}

    r = role_of(current_user)
    if is_admin_or_pm(current_user):
        pass
    elif r == "hosp":
        if row.program_id not in hosp_program_ids(db, current_user):
            raise HTTPException(status_code=403, detail="Unauthorized for this program")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(row)
    db.commit()
    return {"ok": True}
