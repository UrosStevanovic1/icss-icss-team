from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from ..database import get_db
from .. import models, schemas, auth
from ..permissions import role_of, is_admin_or_pm, require_admin_or_pm, require_lecturer_link

router = APIRouter(prefix="/lecturers", tags=["lecturers"])


def _load_lecturer_with_relations(db: Session, lecturer_id: int):
    # keep your old domain_rel joinedload for backward compatibility,
    # but also load the new many-to-many domains
    return (
        db.query(models.Lecturer)
        .options(
            joinedload(models.Lecturer.modules),
            joinedload(models.Lecturer.domain_rel),
            joinedload(models.Lecturer.domains),
        )
        .filter(models.Lecturer.id == lecturer_id)
        .first()
    )


def _validate_and_fetch_domains(db: Session, domain_ids: List[int]) -> List[models.Domain]:
    if not domain_ids:
        return []

    # remove duplicates but keep order
    seen = set()
    unique_ids = []
    for d in domain_ids:
        if d not in seen:
            seen.add(d)
            unique_ids.append(d)

    found = db.query(models.Domain).filter(models.Domain.id.in_(unique_ids)).all()
    found_ids = {d.id for d in found}
    missing = [d for d in unique_ids if d not in found_ids]
    if missing:
        raise HTTPException(status_code=400, detail=f"Invalid domain_id(s): {missing}")
    return found


def _sync_single_domain_fk(row: models.Lecturer):
    """
    Optional: keep legacy domain_id/domain_rel in sync so older frontend
    (or other parts of the backend) still work.
    Uses the FIRST domain in row.domains (if any).
    """
    if getattr(row, "domains", None) and len(row.domains) > 0:
        row.domain_id = row.domains[0].id
    else:
        row.domain_id = None


@router.get("/", response_model=List[schemas.LecturerResponse])
def read_lecturers(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    r = role_of(current_user)

    if r == "hosp" or is_admin_or_pm(current_user):
        return (
            db.query(models.Lecturer)
            .options(
                joinedload(models.Lecturer.modules),
                joinedload(models.Lecturer.domain_rel),
                joinedload(models.Lecturer.domains),
            )
            .all()
        )

    if r == "lecturer":
        lec_id = require_lecturer_link(current_user)
        lec = (
            db.query(models.Lecturer)
            .options(
                joinedload(models.Lecturer.modules),
                joinedload(models.Lecturer.domain_rel),
                joinedload(models.Lecturer.domains),
            )
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
        .options(
            joinedload(models.Lecturer.modules),
            joinedload(models.Lecturer.domain_rel),
            joinedload(models.Lecturer.domains),
        )
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

    lec = (
        db.query(models.Lecturer)
        .options(
            joinedload(models.Lecturer.modules),
            joinedload(models.Lecturer.domain_rel),
            joinedload(models.Lecturer.domains),
        )
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

    # ✅ NEW: pop domain_ids from payload so Lecturer(**data) doesn't crash
    domain_ids = data.pop("domain_ids", []) or []

    row = models.Lecturer(**data)

    # ✅ NEW: set many-to-many domains
    row.domains = _validate_and_fetch_domains(db, domain_ids)

    # ✅ OPTIONAL: keep old single FK synced
    _sync_single_domain_fk(row)

    db.add(row)
    db.commit()

    row = _load_lecturer_with_relations(db, row.id)
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

    # ✅ NEW: handle domains if provided
    # None => not provided (leave unchanged), [] => clear all
    if "domain_ids" in data:
        domain_ids = data.pop("domain_ids")
        if domain_ids is None:
            pass
        else:
            row.domains = _validate_and_fetch_domains(db, domain_ids)
            _sync_single_domain_fk(row)

    # keep old behavior for all other fields
    for k, v in data.items():
        setattr(row, k, v)

    db.commit()

    row = _load_lecturer_with_relations(db, id)
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
        .options(
            joinedload(models.Lecturer.modules),
            joinedload(models.Lecturer.domain_rel),
            joinedload(models.Lecturer.domains),
        )
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
        .options(
            joinedload(models.Lecturer.modules),
            joinedload(models.Lecturer.domain_rel),
            joinedload(models.Lecturer.domains),
        )
        .filter(models.Lecturer.id == id)
        .first()
    )
    return lec
