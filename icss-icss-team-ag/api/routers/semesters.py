from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas, auth  # ✅ Added auth import
from ..permissions import is_admin_or_pm

router = APIRouter(prefix="/semesters", tags=["semesters"])

# GET is open to all users (so the frontend table can load for everyone)
@router.get("/", response_model=List[schemas.SemesterResponse])
def get_semesters(db: Session = Depends(get_db)):
    return db.query(models.Semester).order_by(models.Semester.start_date.desc()).all()

@router.post("/", response_model=schemas.SemesterResponse)
def create_semester(
    semester: schemas.SemesterCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)  # ✅ Require login
):
    # ✅ Check if user has PM/Admin permissions
    if not is_admin_or_pm(current_user):
        raise HTTPException(status_code=403, detail="Not allowed")

    # Check if semester already exists
    existing = db.query(models.Semester).filter(models.Semester.name == semester.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Semester already exists")

    new_semester = models.Semester(**semester.model_dump())
    db.add(new_semester)
    db.commit()
    db.refresh(new_semester)
    return new_semester

@router.delete("/{semester_id}")
def delete_semester(
    semester_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)  # ✅ Require login
):
    # ✅ Check if user has PM/Admin permissions
    if not is_admin_or_pm(current_user):
        raise HTTPException(status_code=403, detail="Not allowed")

    semester = db.query(models.Semester).filter(models.Semester.id == semester_id).first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")

    db.delete(semester)
    db.commit()
    return {"message": "Semester deleted"}