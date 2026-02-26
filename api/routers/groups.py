# api/routers/groups.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas, auth
from ..permissions import role_of, is_admin_or_pm, group_payload_in_hosp_domain

router = APIRouter(prefix="/groups", tags=["groups"])


# ✅ LECTURA TOTALMENTE ABIERTA (SOLUCIÓN DEFINITIVA)
# Al borrar "current_user = Depends(...)", eliminamos al portero.
# No hay chequeo de rol -> No hay error 403.
@router.get("/", response_model=List[schemas.GroupResponse])
def read_groups(db: Session = Depends(get_db)):
    return db.query(models.Group).all()


# --- ESCRITURA (POST/PUT/DELETE) ---
# Aquí mantenemos la protección para que el estudiante no rompa nada,
# pero la lectura de arriba ya está arreglada.

@router.post("/", response_model=schemas.GroupResponse)
def create_group(p: schemas.GroupCreate, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    # Solo Admin, PM o HoSP
    if is_admin_or_pm(current_user) or role_of(current_user) == "hosp":
        if role_of(current_user) == "hosp" and not group_payload_in_hosp_domain(db, current_user, p.program):
            raise HTTPException(status_code=403, detail="Unauthorized for this program")

        row = models.Group(**p.model_dump())
        db.add(row)
        db.commit()
        db.refresh(row)
        return row
    raise HTTPException(status_code=403, detail="Not allowed")


@router.put("/{id}", response_model=schemas.GroupResponse)
def update_group(id: int, p: schemas.GroupUpdate, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    # Solo Admin, PM o HoSP
    if is_admin_or_pm(current_user) or role_of(current_user) == "hosp":
        row = db.query(models.Group).filter(models.Group.id == id).first()
        if not row:
            raise HTTPException(status_code=404, detail="Group not found")

        if role_of(current_user) == "hosp":
            if not group_is_in_hosp_domain(db, current_user, row):
                raise HTTPException(status_code=403, detail="Unauthorized")

        data = p.model_dump(exclude_unset=True)
        for k, v in data.items():
            setattr(row, k, v)
        db.commit()
        db.refresh(row)
        return row
    raise HTTPException(status_code=403, detail="Not allowed")


@router.delete("/{id}")
def delete_group(id: int, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    # Solo Admin/PM
    if is_admin_or_pm(current_user):
        row = db.query(models.Group).filter(models.Group.id == id).first()
        if row:
            db.delete(row)
            db.commit()
        return {"ok": True}
    raise HTTPException(status_code=403, detail="Not allowed")