from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from ..database import get_db
from .. import models, schemas, auth
from ..permissions import role_of, is_admin_or_pm, require_admin_or_pm, require_lecturer_link

router = APIRouter(prefix="/lecturers", tags=["lecturers"])


@router.get("/", response_model=List[schemas.LecturerResponse])
def read_lecturers(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    r = role_of(current_user)

    if r == "hosp" or is_admin_or_pm(current_user):
        # ✅ load assigned modules + domain relation
        return (
            db.query(models.Lecturer)
            .options(joinedload(models.Lecturer.modules), joinedload(models.Lecturer.domain_rel))
            .all()
        )

    if r == "lecturer":
        lec_id = require_lecturer_link(current_user)
        lec = (
            db.query(models.Lecturer)
            .options(joinedload(models.Lecturer.modules), joinedload(models.Lecturer.domain_rel))
            .filter(models.Lecturer.id == lec_id)
            .first()
        )
        return [lec] if lec else []

    raise HTTPException(status_code=403, detail="Not allowed")


@router.get("/me", response_model=schemas.LecturerResponse)
def get_my_lecturer_profile(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if role_of(current_user) != "lecturer":
        raise HTTPException(status_code=403, detail="Not allowed")
    lec_id = require_lecturer_link(current_user)
    lec = (
        db.query(models.Lecturer)
        .options(joinedload(models.Lecturer.modules), joinedload(models.Lecturer.domain_rel))
        .filter(models.Lecturer.id == lec_id)
        .first()
    )
    if not lec:
        raise HTTPException(status_code=404, detail="Lecturer profile not found")
    return lec


@router.patch("/me", response_model=schemas.LecturerResponse)
def update_my_lecturer_profile(
    p: schemas.LecturerSelfUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
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
    # reload with relations so response contains domain/modules if needed
    lec = (
        db.query(models.Lecturer)
        .options(joinedload(models.Lecturer.modules), joinedload(models.Lecturer.domain_rel))
        .filter(models.Lecturer.id == lec_id)
        .first()
    )
    return lec


@router.post("/", response_model=schemas.LecturerResponse)
def create_lecturer(
    p: schemas.LecturerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    require_admin_or_pm(current_user)

    data = p.model_dump(exclude_unset=True)

    # ✅ validate domain_id if provided (or allow None)
    domain_id = data.get("domain_id", None)
    if domain_id is not None:
        exists = db.query(models.Domain).filter(models.Domain.id == domain_id).first()
        if not exists:
            raise HTTPException(status_code=400, detail="Invalid domain_id")

    row = models.Lecturer(**data)
    db.add(row)
    db.commit()

    row = (
        db.query(models.Lecturer)
        .options(joinedload(models.Lecturer.modules), joinedload(models.Lecturer.domain_rel))
        .filter(models.Lecturer.id == row.id)
        .first()
    )
    return row


@router.put("/{id}", response_model=schemas.LecturerResponse)
def update_lecturer(
    id: int,
    p: schemas.LecturerUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    require_admin_or_pm(current_user)
    row = db.query(models.Lecturer).filter(models.Lecturer.id == id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Lecturer not found")

    data = p.model_dump(exclude_unset=True)

    # ✅ validate domain_id if provided (or allow None)
    if "domain_id" in data:
        domain_id = data["domain_id"]
        if domain_id is not None:
            exists = db.query(models.Domain).filter(models.Domain.id == domain_id).first()
            if not exists:
                raise HTTPException(status_code=400, detail="Invalid domain_id")

    for k, v in data.items():
        setattr(row, k, v)

    db.commit()

    row = (
        db.query(models.Lecturer)
        .options(joinedload(models.Lecturer.modules), joinedload(models.Lecturer.domain_rel))
        .filter(models.Lecturer.id == id)
        .first()
    )
    return row


@router.delete("/{id}")
def delete_lecturer(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    require_admin_or_pm(current_user)
    row = db.query(models.Lecturer).filter(models.Lecturer.id == id).first()
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}


# ✅ NEW: list modules assigned to a lecturer
@router.get("/{id}/modules", response_model=List[schemas.ModuleMini])
def get_lecturer_modules(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    r = role_of(current_user)
    if not (r == "hosp" or is_admin_or_pm(current_user)):
        raise HTTPException(status_code=403, detail="Not allowed")

    lec = (
        db.query(models.Lecturer)
        .options(joinedload(models.Lecturer.modules))
        .filter(models.Lecturer.id == id)
        .first()
    )
    if not lec:
        raise HTTPException(status_code=404, detail="Lecturer not found")

    return lec.modules


# ✅ NEW: replace lecturer's module list (set exactly)
@router.put("/{id}/modules", response_model=schemas.LecturerResponse)
def set_lecturer_modules(
    id: int,
    p: schemas.LecturerModulesUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    require_admin_or_pm(current_user)

    lec = (
        db.query(models.Lecturer)
        .options(joinedload(models.Lecturer.modules), joinedload(models.Lecturer.domain_rel))
        .filter(models.Lecturer.id == id)
        .first()
    )
    if not lec:
        raise HTTPException(status_code=404, detail="Lecturer not found")

    if not p.module_codes:
        lec.modules = []
    else:
        mods = db.query(models.Module).filter(models.Module.module_code.in_(p.module_codes)).all()
        found = {m.module_code for m in mods}
        missing = [c for c in p.module_codes if c not in found]
        if missing:
            raise HTTPException(status_code=400, detail=f"Unknown module_code(s): {missing}")
        lec.modules = mods

    db.commit()

    lec = (
        db.query(models.Lecturer)
        .options(joinedload(models.Lecturer.modules), joinedload(models.Lecturer.domain_rel))
        .filter(models.Lecturer.id == id)
        .first()
    )
    return lec
