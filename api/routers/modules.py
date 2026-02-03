from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from ..database import get_db
from .. import models, schemas, auth
from ..permissions import role_of, is_admin_or_pm, hosp_program_ids, require_admin_or_pm

router = APIRouter(prefix="/modules", tags=["modules"])

# ✅ GET: Leer todos los módulos
@router.get("/", response_model=List[schemas.ModuleResponse])
def read_modules(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Module).options(joinedload(models.Module.specializations)).all()

# ✅ POST: Crear módulo
@router.post("/", response_model=schemas.ModuleResponse)
def create_module(p: schemas.ModuleCreate, db: Session = Depends(get_db),
                  current_user: models.User = Depends(auth.get_current_user)):
    r = role_of(current_user)
    if is_admin_or_pm(current_user):
        pass
    elif r == "hosp":
        if p.program_id is None:
            raise HTTPException(status_code=400, detail="program_id is required")
        if p.program_id not in hosp_program_ids(db, current_user):
            raise HTTPException(status_code=403, detail="You can only create modules for your program")
    else:
        raise HTTPException(status_code=403, detail="Only Admins, PMs or HoSPs can create modules")

    # Usamos model_dump para Pydantic v2
    module_data = p.model_dump(exclude={"specialization_ids"})
    row = models.Module(**module_data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

# ✅ PUT: Editar módulo
@router.put("/{module_code}", response_model=schemas.ModuleResponse)
def update_module(module_code: str, p: schemas.ModuleUpdate, db: Session = Depends(get_db),
                  current_user: models.User = Depends(auth.get_current_user)):
    row = db.query(models.Module).filter(models.Module.module_code == module_code).first()
    if not row:
        raise HTTPException(status_code=404, detail="Module not found")

    r = role_of(current_user)
    if not is_admin_or_pm(current_user):
        if r != "hosp" or row.program_id not in hosp_program_ids(db, current_user):
            raise HTTPException(status_code=403, detail="Not authorized to update this module")

    data = p.model_dump(exclude_unset=True)
    if "specialization_ids" in data:
        spec_ids = data.pop("specialization_ids")
        if spec_ids is not None:
            specs = db.query(models.Specialization).filter(models.Specialization.id.in_(spec_ids)).all()
            row.specializations = specs

    for k, v in data.items():
        setattr(row, k, v)

    db.commit()
    db.refresh(row)
    return row

# ✅ DELETE: Borrar módulo
@router.delete("/{module_code}")
def delete_module(module_code: str, db: Session = Depends(get_db),
                  current_user: models.User = Depends(auth.get_current_user)):
    require_admin_or_pm(current_user)
    row = db.query(models.Module).filter(models.Module.module_code == module_code).first()
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}