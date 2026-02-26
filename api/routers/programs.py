# api/routers/programs.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from ..database import get_db
from .. import models, schemas, auth
from ..permissions import role_of, is_admin_or_pm

router = APIRouter(prefix="/study-programs", tags=["study-programs"])


# ✅ SOLUCIÓN: Permitimos lectura a TODOS los usuarios autenticados
# Antes tenía un bloqueo si eras estudiante. Ahora lo quitamos.
@router.get("/", response_model=List[schemas.StudyProgramResponse])
def read_programs(
        db: Session = Depends(get_db),
        current_user: models.User = Depends(auth.get_current_user),
):
    # Students can read programs (read-only in UI)
    return (
        db.query(models.StudyProgram)
        .options(joinedload(models.StudyProgram.head_lecturer))
        .all()
    )


# --- POST / PUT / DELETE: Mantenemos el bloqueo para estudiantes ---

@router.post("/", response_model=schemas.StudyProgramResponse)
def create_program(
        program: schemas.StudyProgramCreate,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(auth.get_current_user),
):
    if not is_admin_or_pm(current_user):
        raise HTTPException(status_code=403, detail="Not allowed")

    db_program = models.StudyProgram(**program.model_dump())
    db.add(db_program)
    db.commit()
    db.refresh(db_program)
    return db_program


@router.put("/{program_id}", response_model=schemas.StudyProgramResponse)
def update_program(
        program_id: int,
        program: schemas.StudyProgramUpdate,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(auth.get_current_user),
):
    if not is_admin_or_pm(current_user):
        raise HTTPException(status_code=403, detail="Not allowed")

    db_program = db.query(models.StudyProgram).filter(models.StudyProgram.id == program_id).first()
    if not db_program:
        raise HTTPException(status_code=404, detail="Program not found")

    for key, value in program.model_dump(exclude_unset=True).items():
        setattr(db_program, key, value)

    db.commit()
    db.refresh(db_program)
    return db_program


@router.delete("/{program_id}")
def delete_program(
        program_id: int,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(auth.get_current_user),
):
    if not is_admin_or_pm(current_user):
        raise HTTPException(status_code=403, detail="Not allowed")

    db_program = db.query(models.StudyProgram).filter(models.StudyProgram.id == program_id).first()
    if not db_program:
        raise HTTPException(status_code=404, detail="Program not found")

    db.delete(db_program)
    db.commit()
    return {"ok": True}