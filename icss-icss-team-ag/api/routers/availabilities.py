# api/routers/availabilities.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas, auth
from ..permissions import role_of, is_admin_or_pm, require_lecturer_link

router = APIRouter(prefix="/availabilities", tags=["availabilities"])

@router.get("/", response_model=List[schemas.AvailabilityResponse])
def read_availabilities(db: Session = Depends(get_db),
                        current_user: models.User = Depends(auth.get_current_user)):
    r = role_of(current_user)
    if is_admin_or_pm(current_user):
        return db.query(models.LecturerAvailability).all()
    if r == "lecturer":
        lec_id = require_lecturer_link(current_user)
        return db.query(models.LecturerAvailability).filter(
            models.LecturerAvailability.lecturer_id == lec_id
        ).all()
    raise HTTPException(status_code=403, detail="Not allowed")

@router.post("/update", response_model=schemas.AvailabilityResponse)
def update_availability(payload: schemas.AvailabilityUpdate, db: Session = Depends(get_db),
                        current_user: models.User = Depends(auth.get_current_user)):
    r = role_of(current_user)

    if is_admin_or_pm(current_user):
        pass
    elif r == "lecturer":
        lec_id = require_lecturer_link(current_user)
        if lec_id != payload.lecturer_id:
            raise HTTPException(status_code=403, detail="Cannot edit other lecturer availability")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    existing = db.query(models.LecturerAvailability).filter(
        models.LecturerAvailability.lecturer_id == payload.lecturer_id
    ).first()

    if existing:
        existing.schedule_data = payload.schedule_data
        db.commit()
        db.refresh(existing)
        return existing

    row = models.LecturerAvailability(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.delete("/lecturer/{lecturer_id}")
def delete_availability(lecturer_id: int, db: Session = Depends(get_db),
                        current_user: models.User = Depends(auth.get_current_user)):
    r = role_of(current_user)
    if is_admin_or_pm(current_user):
        pass
    elif r == "lecturer":
        lec_id = require_lecturer_link(current_user)
        if lec_id != lecturer_id:
            raise HTTPException(status_code=403, detail="Cannot delete other lecturer availability")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    row = db.query(models.LecturerAvailability).filter(
        models.LecturerAvailability.lecturer_id == lecturer_id
    ).first()
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}
