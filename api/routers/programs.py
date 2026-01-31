# api/routers/programs.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from ..database import get_db
from .. import models, schemas, auth
from ..permissions import require_admin_or_pm, role_of, check_is_hosp_for_program

router = APIRouter(prefix="/study-programs", tags=["study-programs"])

@router.get("/", response_model=List[schemas.StudyProgramResponse])
def read_programs(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.StudyProgram).options(joinedload(models.StudyProgram.head_lecturer)).all()

@router.post("/", response_model=schemas.StudyProgramResponse)
def create_program(p: schemas.StudyProgramCreate, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    require_admin_or_pm(current_user)
    row = models.StudyProgram(**p.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.put("/{id}", response_model=schemas.StudyProgramResponse)
def update_program(id: int, p: schemas.StudyProgramUpdate, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    row = db.query(models.StudyProgram).filter(models.StudyProgram.id == id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Program not found")

    check_is_hosp_for_program(current_user, row)

    data = p.model_dump(exclude_unset=True)
    if role_of(current_user) == "hosp" and "head_of_program_id" in data:
        raise HTTPException(status_code=403, detail="HoSP cannot change head_of_program_id")

    for k, v in data.items():
        setattr(row, k, v)

    db.commit()
    db.refresh(row)
    return row

@router.delete("/{id}")
def delete_program(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_admin_or_pm(current_user)
    row = db.query(models.StudyProgram).filter(models.StudyProgram.id == id).first()
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}
