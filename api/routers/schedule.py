from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db
from .. import models, auth

router = APIRouter(prefix="/schedule", tags=["schedule"])



class ScheduleCreate(BaseModel):
    offered_module_id: int
    room_id: Optional[int] = None
    day_of_week: str  # "Monday", "Tuesday"...
    start_time: str  # "08:00"
    end_time: str  # "10:00"
    semester: str  # "Winter 2024"


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

    class Config:
        orm_mode = True



@router.get("/", response_model=List[ScheduleResponse])
def get_schedule(semester: str, db: Session = Depends(get_db)):

    query = db.query(models.ScheduleEntry).filter(
        models.ScheduleEntry.semester == semester
    ).options(
        joinedload(models.ScheduleEntry.offered_module).joinedload(models.OfferedModule.module),
        joinedload(models.ScheduleEntry.offered_module).joinedload(models.OfferedModule.lecturer),
        joinedload(models.ScheduleEntry.room)
    )

    results = query.all()

    mapped = []
    for r in results:

        mod_name = r.offered_module.module.name if (r.offered_module and r.offered_module.module) else "Unknown"
        lec_name = "Unassigned"
        if r.offered_module and r.offered_module.lecturer:
            lec_name = f"{r.offered_module.lecturer.first_name} {r.offered_module.lecturer.last_name}"

        room_name = r.room.name if r.room else "No Room"

        mapped.append({
            "id": r.id,
            "offered_module_id": r.offered_module_id,
            "module_name": mod_name,
            "lecturer_name": lec_name,
            "room_name": room_name,
            "day_of_week": r.day_of_week,
            "start_time": r.start_time,
            "end_time": r.end_time,
            "semester": r.semester
        })
    return mapped


@router.post("/", response_model=ScheduleResponse)
def create_schedule_entry(entry: ScheduleCreate, db: Session = Depends(get_db)):
    """Crea una nueva clase en el calendario."""


    offer = db.query(models.OfferedModule).filter(models.OfferedModule.id == entry.offered_module_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offered Module not found")


    new_entry = models.ScheduleEntry(
        offered_module_id=entry.offered_module_id,
        room_id=entry.room_id,
        day_of_week=entry.day_of_week,
        start_time=entry.start_time,
        end_time=entry.end_time,
        semester=entry.semester
    )

    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)


    return {
        "id": new_entry.id,
        "offered_module_id": new_entry.offered_module_id,
        "module_name": "Loaded...",
        "lecturer_name": "Loaded...",
        "room_name": "Loaded...",
        "day_of_week": new_entry.day_of_week,
        "start_time": new_entry.start_time,
        "end_time": new_entry.end_time,
        "semester": new_entry.semester
    }


@router.delete("/{id}")
def delete_schedule_entry(id: int, db: Session = Depends(get_db)):
    entry = db.query(models.ScheduleEntry).filter(models.ScheduleEntry.id == id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    db.delete(entry)
    db.commit()
    return {"ok": True}