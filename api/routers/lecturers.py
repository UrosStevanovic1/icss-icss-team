from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas, auth
from ..permissions import role_of, is_admin_or_pm

router = APIRouter(prefix="/lecturers", tags=["lecturers"])


# ✅ GET: Ver todos (Público/Autenticado)
@router.get("/", response_model=List[schemas.LecturerResponse])
def read_lecturers(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Lecturer).all()


# ✅ POST: Crear (Solo Admin/PM/HoSP)
@router.post("/", response_model=schemas.LecturerResponse)
def create_lecturer(p: schemas.LecturerCreate, db: Session = Depends(get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    # Validar permisos: Estudiantes y Lecturers NO pueden crear
    r = role_of(current_user)
    if r in ["student", "lecturer"]:
        raise HTTPException(status_code=403, detail="Only Admins can create lecturers")

    new_lecturer = models.Lecturer(**p.dict())
    db.add(new_lecturer)
    db.commit()
    db.refresh(new_lecturer)
    return new_lecturer


# ✅ PUT: Editar (Lógica Especial Híbrida)
@router.put("/{lecturer_id}", response_model=schemas.LecturerResponse)
def update_lecturer(lecturer_id: int, p: schemas.LecturerUpdate, db: Session = Depends(get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    # 1. Buscar al lecturer en la base de datos
    lecturer = db.query(models.Lecturer).filter(models.Lecturer.id == lecturer_id).first()
    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer not found")

    r = role_of(current_user)

    # 2. Lógica de Permisos
    if is_admin_or_pm(current_user) or r == "hosp":
        # CASO A: Es Jefe -> Actualizamos
        for key, value in p.dict(exclude_unset=True).items():
            setattr(lecturer, key, value)

    elif r == "lecturer":
        # CASO B: Es Profesor -> Solo actualizamos Phone y Personal Email
        # Ignoramos cualquier otro dato que venga del frontend (Name, Load, etc.)
        if p.phone is not None:
            lecturer.phone = p.phone
        if p.personal_email is not None:
            lecturer.personal_email = p.personal_email
        # NO tocamos teaching_load, ni mdh_email, ni nombre, etc.

    else:
        # CASO C: Es Estudiante -> Error 403
        raise HTTPException(status_code=403, detail="Not authorized to edit lecturers")

    db.commit()
    db.refresh(lecturer)
    return lecturer


# ✅ DELETE: Borrar (Solo Admin/PM/HoSP)
@router.delete("/{lecturer_id}")
def delete_lecturer(lecturer_id: int, db: Session = Depends(get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    r = role_of(current_user)
    if r in ["student", "lecturer"]:
        raise HTTPException(status_code=403, detail="Only Admins can delete lecturers")

    lecturer = db.query(models.Lecturer).filter(models.Lecturer.id == lecturer_id).first()
    if lecturer:
        db.delete(lecturer)
        db.commit()
    return {"ok": True}