from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Any
import json

from ..database import get_db
from .. import models, schemas, auth
from ..permissions import role_of, is_admin_or_pm, hosp_program_ids

router = APIRouter(prefix="/modules", tags=["modules"])


def _safe_json_load(s: Optional[str]) -> Optional[Any]:
    if not s or not isinstance(s, str):
        return None
    s = s.strip()
    if not s:
        return None
    try:
        return json.loads(s)
    except Exception:
        return None


def _parse_module_payload(assessment_type_value: Optional[str]) -> dict:
    parsed = _safe_json_load(assessment_type_value)

    if isinstance(parsed, list):
        return {"assessments": parsed, "lecturer_assignments": []}

    if isinstance(parsed, dict):
        return {
            "assessments": parsed.get("assessments") or [],
            "lecturer_assignments": parsed.get("lecturer_assignments") or []
        }

    if assessment_type_value and isinstance(assessment_type_value, str):
        return {"assessments": [], "lecturer_assignments": [], "legacy": assessment_type_value}

    return {"assessments": [], "lecturer_assignments": []}


def _normalize_assessments(breakdown: List[schemas.AssessmentPart]) -> List[dict]:
    if breakdown is None:
        return []

    items = []
    seen = set()

    for x in breakdown:
        t = (x.type or "").strip()
        if not t:
            raise HTTPException(status_code=400, detail="Assessment type cannot be empty.")
        key = t.lower()
        if key in seen:
            raise HTTPException(status_code=400, detail=f"Duplicate assessment type: {t}")
        seen.add(key)
        w = x.weight if getattr(x, "weight", None) is not None else None
        if w is not None:
            try:
                w = int(w)
            except Exception:
                raise HTTPException(status_code=400, detail="Assessment weight must be an integer.")
            if w < 0 or w > 100:
                raise HTTPException(status_code=400, detail="Assessment weight must be between 0 and 100.")
        items.append({"type": t, "weight": w})

    n = len(items)
    if n == 0:
        return []

    if n == 1:
        w = items[0]["weight"]
        if w is None:
            items[0]["weight"] = 100
            return items
        if w != 100:
            raise HTTPException(status_code=400, detail="If only 1 assessment type is provided, weight must be 100.")
        return items

    specified = [i for i in items if i["weight"] is not None]
    unspecified = [i for i in items if i["weight"] is None]

    specified_sum = sum(i["weight"] for i in specified) if specified else 0
    if specified_sum > 100:
        raise HTTPException(status_code=400, detail=f"Assessment weights exceed 100 (got {specified_sum}).")

    remaining = 100 - specified_sum

    if len(unspecified) == 0:
        if specified_sum != 100:
            raise HTTPException(status_code=400, detail=f"Assessment weights must sum to 100 (got {specified_sum}).")
        return items

    if len(unspecified) == 1:
        unspecified[0]["weight"] = remaining
        return items

    base = remaining // len(unspecified)
    extra = remaining % len(unspecified)
    for idx, i in enumerate(unspecified):
        i["weight"] = base + (1 if idx < extra else 0)

    total = sum(i["weight"] for i in items)
    if total != 100:
        raise HTTPException(status_code=400, detail=f"Assessment weights must sum to 100 (got {total}).")
    return items


def _validate_assignments(db: Session, assignments: List[schemas.LecturerAssignment]):
    if not assignments:
        return

    lecturer_ids = {a.lecturer_id for a in assignments}
    existing_lecturers = set(
        x[0] for x in db.query(models.Lecturer.id).filter(models.Lecturer.id.in_(lecturer_ids)).all()
    )
    missing = lecturer_ids - existing_lecturers
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown lecturer_id(s): {sorted(list(missing))}")

    group_ids = {a.group_id for a in assignments if a.group_id is not None}
    if group_ids:
        existing_groups = set(
            x[0] for x in db.query(models.Group.id).filter(models.Group.id.in_(group_ids)).all()
        )
        missing_g = group_ids - existing_groups
        if missing_g:
            raise HTTPException(status_code=400, detail=f"Unknown group_id(s): {sorted(list(missing_g))}")


def _make_response(row: models.Module) -> schemas.ModuleResponse:
    payload = _parse_module_payload(row.assessment_type)
    assessments = payload.get("assessments") or []
    assignments = payload.get("lecturer_assignments") or []

    legacy = payload.get("legacy")
    assessment_type_out = legacy if legacy else row.assessment_type

    return schemas.ModuleResponse(
        module_code=row.module_code,
        name=row.name,
        ects=row.ects,
        room_type=row.room_type,
        assessment_type=assessment_type_out,
        semester=row.semester,
        category=row.category,
        program_id=row.program_id,
        specializations=row.specializations or [],
        assessment_breakdown=assessments,
        lecturer_assignments=assignments
    )


@router.get("/", response_model=List[schemas.ModuleResponse])
def read_modules(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    rows = (
        db.query(models.Module)
        .options(joinedload(models.Module.specializations))
        .all()
    )
    return [_make_response(r) for r in rows]


@router.post("/", response_model=schemas.ModuleResponse)
def create_module(
    p: schemas.ModuleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
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

    data = p.model_dump()

    spec_ids = data.pop("specialization_ids", None)
    assessment_breakdown = data.pop("assessment_breakdown", None)
    lecturer_assignments = data.pop("lecturer_assignments", None)

    normalized_assessments = None
    if assessment_breakdown is not None:
        normalized_assessments = _normalize_assessments(assessment_breakdown)

    if lecturer_assignments is not None:
        _validate_assignments(db, lecturer_assignments)

    if assessment_breakdown is not None or lecturer_assignments is not None:
        payload = {
            "assessments": normalized_assessments if normalized_assessments is not None else [],
            "lecturer_assignments": lecturer_assignments or []
        }
        data["assessment_type"] = json.dumps(payload)

    row = models.Module(**data)

    if spec_ids:
        specs = db.query(models.Specialization).filter(models.Specialization.id.in_(spec_ids)).all()
        row.specializations = specs

    db.add(row)
    db.commit()
    db.refresh(row)

    row = (
        db.query(models.Module)
        .filter(models.Module.module_code == row.module_code)
        .options(joinedload(models.Module.specializations))
        .first()
    )
    return _make_response(row)


@router.put("/{module_code}", response_model=schemas.ModuleResponse)
def update_module(
    module_code: str,
    p: schemas.ModuleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    row = (
        db.query(models.Module)
        .filter(models.Module.module_code == module_code)
        .options(joinedload(models.Module.specializations))
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Module not found")

    r = role_of(current_user)
    if is_admin_or_pm(current_user):
        pass
    elif r == "hosp":
        if row.program_id not in hosp_program_ids(db, current_user):
            raise HTTPException(status_code=403, detail="Unauthorized for this program")
        if p.program_id is not None and p.program_id not in hosp_program_ids(db, current_user):
            raise HTTPException(status_code=403, detail="Cannot move module to another program")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    data = p.model_dump(exclude_unset=True)

    if "specialization_ids" in data:
        spec_ids = data.pop("specialization_ids")
        if spec_ids is not None:
            specs = db.query(models.Specialization).filter(models.Specialization.id.in_(spec_ids)).all()
            row.specializations = specs

    assessment_breakdown = data.pop("assessment_breakdown", None)
    lecturer_assignments = data.pop("lecturer_assignments", None)

    normalized_assessments = None
    if assessment_breakdown is not None:
        normalized_assessments = _normalize_assessments(assessment_breakdown)

    if lecturer_assignments is not None:
        _validate_assignments(db, lecturer_assignments)

    if assessment_breakdown is not None or lecturer_assignments is not None:
        existing = _parse_module_payload(row.assessment_type)
        merged_payload = {
            "assessments": normalized_assessments if normalized_assessments is not None else (existing.get("assessments") or []),
            "lecturer_assignments": lecturer_assignments if lecturer_assignments is not None else (existing.get("lecturer_assignments") or [])
        }
        row.assessment_type = json.dumps(merged_payload)

    for k, v in data.items():
        setattr(row, k, v)

    db.commit()
    db.refresh(row)
    return _make_response(row)


@router.delete("/{module_code}")
def delete_module(
    module_code: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    row = db.query(models.Module).filter(models.Module.module_code == module_code).first()
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
