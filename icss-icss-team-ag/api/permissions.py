# api/permissions.py
from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from . import models


def role_of(user: models.User) -> str:
    return (user.role or "").lower()


def is_admin_or_pm(user: models.User) -> bool:
    return role_of(user) in ["admin", "pm"]


def require_admin_or_pm(user: models.User):
    if not is_admin_or_pm(user):
        raise HTTPException(status_code=403, detail="Admin/PM privileges required")


def require_lecturer_link(user: models.User) -> int:
    if user.lecturer_id is None:
        raise HTTPException(status_code=403, detail="User is not linked to a lecturer profile")
    return int(user.lecturer_id)

def hosp_programs(db: Session, user: models.User) -> List[models.StudyProgram]:
    lec_id = require_lecturer_link(user)
    return (
        db.query(models.StudyProgram)
        .filter(models.StudyProgram.head_of_program_id == lec_id)
        .all()
    )


def hosp_program_ids(db: Session, user: models.User) -> List[int]:
    return [p.id for p in hosp_programs(db, user)]


def check_is_hosp_for_program(user: models.User, program: models.StudyProgram):
    r = role_of(user)
    if r in ["admin", "pm"]:
        return True
    if r == "hosp":
        if user.lecturer_id != program.head_of_program_id:
            raise HTTPException(status_code=403, detail="Unauthorized for this program")
        return True
    raise HTTPException(status_code=403, detail="Access denied")

def group_payload_in_hosp_domain(db: Session, user: models.User, program_field: Optional[str]) -> bool:
    progs = hosp_programs(db, user)
    val = (program_field or "").strip().lower()
    allowed = set()
    for p in progs:
        allowed.add((p.name or "").strip().lower())
        allowed.add((p.acronym or "").strip().lower())
        allowed.add(str(p.id))
    return val in allowed


def group_is_in_hosp_domain(db: Session, user: models.User, group: models.Group) -> bool:
    return group_payload_in_hosp_domain(db, user, group.program)

def hosp_can_manage_constraint(db: Session, user: models.User, scope: str, target_id: Optional[int]) -> bool:
    scope_norm = (scope or "").strip().lower()
    if scope_norm == "program" and target_id is not None:
        return target_id in hosp_program_ids(db, user)
    return False
