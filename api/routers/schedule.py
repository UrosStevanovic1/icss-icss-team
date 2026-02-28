from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, validator
from datetime import datetime, time

from ..database import get_db
from .. import models

router = APIRouter(prefix="/schedule", tags=["schedule"])


def _parse_hhmm(value: str) -> time:
    try:
        return datetime.strptime(value, "%H:%M").time()
    except Exception:
        raise HTTPException(status_code=422, detail=f"Invalid time format '{value}'. Expected HH:MM.")


class ScheduleCreate(BaseModel):
    offered_module_id: int
    room_id: Optional[int] = None
    day_of_week: str
    start_time: str
    end_time: str
    semester: str
    group_ids: Optional[List[int]] = None

    @validator("start_time", "end_time")
    def validate_time_format(cls, v):
        _parse_hhmm(v)
        return v


class ScheduleUpdate(BaseModel):
    offered_module_id: Optional[int] = None
    room_id: Optional[int] = None
    day_of_week: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    semester: Optional[str] = None
    group_ids: Optional[List[int]] = None

    @validator("start_time", "end_time")
    def validate_time_format(cls, v):
        if v is None:
            return v
        _parse_hhmm(v)
        return v


class ScheduleResponse(BaseModel):
    id: int
    offered_module_id: int
    module_name: str
    lecturer_name: str
    room_name: str
    day_of_week: str
    start_time: str
    end_time: str
    semester: str
    group_ids: Optional[List[int]] = None
    group_names: Optional[List[str]] = None

    class Config:
        orm_mode = True


@router.get("/", response_model=List[ScheduleResponse])
def get_schedule(semester: str, db: Session = Depends(get_db)):
    opts = [
        joinedload(models.ScheduleEntry.offered_module).joinedload(models.OfferedModule.module),
        joinedload(models.ScheduleEntry.offered_module).joinedload(models.OfferedModule.lecturer),
        joinedload(models.ScheduleEntry.room),
    ]
    if hasattr(models.ScheduleEntry, "groups"):
        opts.append(joinedload(models.ScheduleEntry.groups))

    results = (
        db.query(models.ScheduleEntry)
        .filter(models.ScheduleEntry.semester == semester)
        .options(*opts)
        .all()
    )

    mapped = []
    for r in results:
        mod_name = r.offered_module.module.name if (r.offered_module and r.offered_module.module) else "Unknown"
        lec_name = "Unassigned"
        if r.offered_module and r.offered_module.lecturer:
            lec_name = f"{r.offered_module.lecturer.first_name} {r.offered_module.lecturer.last_name}"
        room_name = r.room.name if r.room else "No Room"

        group_ids = None
        group_names = None
        if hasattr(r, "groups") and r.groups is not None:
            group_ids = [g.id for g in r.groups]
            group_names = [g.name for g in r.groups]

        mapped.append(
            {
                "id": r.id,
                "offered_module_id": r.offered_module_id,
                "module_name": mod_name,
                "lecturer_name": lec_name,
                "room_name": room_name,
                "day_of_week": r.day_of_week,
                "start_time": r.start_time,
                "end_time": r.end_time,
                "semester": r.semester,
                "group_ids": group_ids,
                "group_names": group_names,
            }
        )
    return mapped


@router.post("/", response_model=ScheduleResponse)
def create_schedule_entry(entry: ScheduleCreate, db: Session = Depends(get_db)):
    offer = db.query(models.OfferedModule).filter(models.OfferedModule.id == entry.offered_module_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offered Module not found")

    start_t = _parse_hhmm(entry.start_time)
    end_t = _parse_hhmm(entry.end_time)
    if end_t <= start_t:
        raise HTTPException(status_code=422, detail="end_time must be after start_time")

    new_entry = models.ScheduleEntry(
        offered_module_id=entry.offered_module_id,
        room_id=entry.room_id,
        day_of_week=entry.day_of_week,
        start_time=entry.start_time,
        end_time=entry.end_time,
        semester=entry.semester,
    )

    if entry.group_ids:
        db_groups = db.query(models.Group).filter(models.Group.id.in_(entry.group_ids)).all()
        if len(db_groups) != len(set(entry.group_ids)):
            raise HTTPException(status_code=404, detail="One or more groups not found")
        if not hasattr(models.ScheduleEntry, "groups"):
            raise HTTPException(status_code=500, detail="ScheduleEntry.groups not in models")
        new_entry.groups = db_groups

    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)

    room_name = new_entry.room.name if new_entry.room else "No Room"
    mod_name = offer.module.name if offer.module else "Unknown"
    lec_name = f"{offer.lecturer.first_name} {offer.lecturer.last_name}" if offer.lecturer else "Unassigned"

    group_ids = [g.id for g in new_entry.groups] if hasattr(new_entry, "groups") and new_entry.groups else None
    group_names = [g.name for g in new_entry.groups] if hasattr(new_entry, "groups") and new_entry.groups else None

    return {
        "id": new_entry.id,
        "offered_module_id": new_entry.offered_module_id,
        "module_name": mod_name,
        "lecturer_name": lec_name,
        "room_name": room_name,
        "day_of_week": new_entry.day_of_week,
        "start_time": new_entry.start_time,
        "end_time": new_entry.end_time,
        "semester": new_entry.semester,
        "group_ids": group_ids,
        "group_names": group_names,
    }


# ✅ NEW: UPDATE (EDIT EXISTING)
@router.put("/{id}", response_model=ScheduleResponse)
def update_schedule_entry(id: int, patch: ScheduleUpdate, db: Session = Depends(get_db)):
    entry = (
        db.query(models.ScheduleEntry)
        .options(
            joinedload(models.ScheduleEntry.offered_module).joinedload(models.OfferedModule.module),
            joinedload(models.ScheduleEntry.offered_module).joinedload(models.OfferedModule.lecturer),
            joinedload(models.ScheduleEntry.room),
            joinedload(models.ScheduleEntry.groups) if hasattr(models.ScheduleEntry, "groups") else joinedload(models.ScheduleEntry.room),
        )
        .filter(models.ScheduleEntry.id == id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    if patch.start_time is not None:
        entry.start_time = patch.start_time
    if patch.end_time is not None:
        entry.end_time = patch.end_time

    if patch.start_time is not None or patch.end_time is not None:
        s = _parse_hhmm(entry.start_time)
        e = _parse_hhmm(entry.end_time)
        if e <= s:
            raise HTTPException(status_code=422, detail="end_time must be after start_time")

    if patch.day_of_week is not None:
        entry.day_of_week = patch.day_of_week
    if patch.semester is not None:
        entry.semester = patch.semester
    if patch.room_id is not None:
        entry.room_id = patch.room_id
    if patch.offered_module_id is not None:
        offer = db.query(models.OfferedModule).filter(models.OfferedModule.id == patch.offered_module_id).first()
        if not offer:
            raise HTTPException(status_code=404, detail="Offered Module not found")
        entry.offered_module_id = patch.offered_module_id

    # groups replace
    if patch.group_ids is not None:
        if not hasattr(models.ScheduleEntry, "groups"):
            raise HTTPException(status_code=500, detail="ScheduleEntry.groups not in models")
        db_groups = []
        if len(patch.group_ids) > 0:
            db_groups = db.query(models.Group).filter(models.Group.id.in_(patch.group_ids)).all()
            if len(db_groups) != len(set(patch.group_ids)):
                raise HTTPException(status_code=404, detail="One or more groups not found")
        entry.groups = db_groups

    db.commit()
    db.refresh(entry)

    offer = entry.offered_module
    mod_name = offer.module.name if (offer and offer.module) else "Unknown"
    lec_name = "Unassigned"
    if offer and offer.lecturer:
        lec_name = f"{offer.lecturer.first_name} {offer.lecturer.last_name}"
    room_name = entry.room.name if entry.room else "No Room"

    group_ids = [g.id for g in entry.groups] if hasattr(entry, "groups") and entry.groups else None
    group_names = [g.name for g in entry.groups] if hasattr(entry, "groups") and entry.groups else None

    return {
        "id": entry.id,
        "offered_module_id": entry.offered_module_id,
        "module_name": mod_name,
        "lecturer_name": lec_name,
        "room_name": room_name,
        "day_of_week": entry.day_of_week,
        "start_time": entry.start_time,
        "end_time": entry.end_time,
        "semester": entry.semester,
        "group_ids": group_ids,
        "group_names": group_names,
    }


@router.delete("/{id}")
def delete_schedule_entry(id: int, db: Session = Depends(get_db)):
    entry = db.query(models.ScheduleEntry).filter(models.ScheduleEntry.id == id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"ok": True}