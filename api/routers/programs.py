from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from ..database import get_db
from .. import models, schemas, auth
from ..permissions import require_admin_or_pm, role_of, check_is_hosp_for_program

router = APIRouter(prefix="/study-programs", tags=["study-programs"])

@router.get("/", response_model=List[schemas.StudyProgramResponse])
def read_programs(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if role_of(current_user) == "student": raise HTTPException(status_code=403)
    return db.query(models.StudyProgram).options(joinedload(models.StudyProgram.head_lecturer)).all()

@router.post("/", response_model=schemas.StudyProgramResponse)
def create_program(p: schemas.StudyProgramCreate, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    r = role_of(current_user)
    # Admin/PM: ✅ | HoSP: ✅ | Lecturer: ❌
    if r not in ["admin", "pm", "hosp"]: raise HTTPException(status_code=403)
    row = models.StudyProgram(**p.model_dump())
    db.add(row)
    db.commit()
    return row

@router.put("/{id}", response_model=schemas.StudyProgramResponse)
def update_program(id: int, p: schemas.StudyProgramUpdate, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    row = db.query(models.StudyProgram).filter(models.StudyProgram.id == id).first()
    if not row: raise HTTPException(status_code=404)
    # check_is_hosp_for_program ya valida si es Admin o si es el HoSP de ese programa
    check_is_hosp_for_program(current_user, row)
    for k, v in p.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    return row

@router.delete("/{id}")
def delete_program(id: int, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    # Según tu tabla, SOLO Admin/PM borran (❌ para HoSP)
    require_admin_or_pm(current_user)
    row = db.query(models.StudyProgram).filter(models.StudyProgram.id == id).first()
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}