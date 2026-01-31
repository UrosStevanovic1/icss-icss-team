# api/routers/lecturers.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas, auth
from ..permissions import role_of, is_admin_or_pm, require_admin_or_pm, require_lecturer_link

router = APIRouter(prefix="/lecturers", tags=["lecturers"])

@router.get("/", response_model=List[schemas.LecturerResponse])
def read_lecturers(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    r = role_of(current_user)

    if r == "hosp" or is_admin_or_pm(current_user):
        return db.query(models.Lecturer).all()

    if r == "lecturer":
        lec_id = require_lecturer_link(current_user)
        lec = db.query(models.Lecturer).filter(models.Lecturer.id == lec_id).first()
        return [lec] if lec else []

    raise HTTPException(status_code=403, detail="Not allowed")

@router.get("/me", response_model=schemas.LecturerResponse)
def get_my_lecturer_profile(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if role_of(current_user) != "lecturer":
        raise HTTPException(status_code=403, detail="Not allowed")
    lec_id = require_lecturer_link(current_user)
    lec = db.query(models.Lecturer).filter(models.Lecturer.id == lec_id).first()
    if not lec:
        raise HTTPException(status_code=404, detail="Lecturer profile not found")
    return lec

@router.patch("/me", response_model=schemas.LecturerResponse)
def update_my_lecturer_profile(p: schemas.LecturerSelfUpdate, db: Session = Depends(get_db),
                               current_user: models.User = Depends(auth.get_current_user)):
    if role_of(current_user) != "lecturer":
        raise HTTPException(status_code=403, detail="Not allowed")
    lec_id = require_lecturer_link(current_user)
    lec = db.query(models.Lecturer).filter(models.Lecturer.id == lec_id).first()
    if not lec:
        raise HTTPException(status_code=404, detail="Lecturer profile not found")

    data = p.model_dump(exclude_unset=True)
    # hard filter to allowed fields only
    for k in list(data.keys()):
        if k not in {"personal_email", "phone"}:
            data.pop(k, None)

    for k, v in data.items():
        setattr(lec, k, v)

    db.commit()
    db.refresh(lec)
    return lec

@router.post("/", response_model=schemas.LecturerResponse)
def create_lecturer(p: schemas.LecturerCreate, db: Session = Depends(get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    require_admin_or_pm(current_user)
    row = models.Lecturer(**p.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.put("/{id}", response_model=schemas.LecturerResponse)
def update_lecturer(id: int, p: schemas.LecturerUpdate, db: Session = Depends(get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    require_admin_or_pm(current_user)
    row = db.query(models.Lecturer).filter(models.Lecturer.id == id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Lecturer not found")

    data = p.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)

    db.commit()
    db.refresh(row)
    return row

@router.delete("/{id}")
def delete_lecturer(id: int, db: Session = Depends(get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    require_admin_or_pm(current_user)
    row = db.query(models.Lecturer).filter(models.Lecturer.id == id).first()
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}
