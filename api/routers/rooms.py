# api/routers/rooms.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas, auth
from ..permissions import require_admin_or_pm

router = APIRouter(prefix="/rooms", tags=["rooms"])

@router.get("/", response_model=List[schemas.RoomResponse])
def read_rooms(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Room).all()

@router.post("/", response_model=schemas.RoomResponse)
def create_room(p: schemas.RoomCreate, db: Session = Depends(get_db),
                current_user: models.User = Depends(auth.get_current_user)):
    require_admin_or_pm(current_user)
    row = models.Room(**p.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.put("/{id}", response_model=schemas.RoomResponse)
def update_room(id: int, p: schemas.RoomUpdate, db: Session = Depends(get_db),
                current_user: models.User = Depends(auth.get_current_user)):
    require_admin_or_pm(current_user)
    row = db.query(models.Room).filter(models.Room.id == id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Room not found")

    data = p.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)

    db.commit()
    db.refresh(row)
    return row

@router.delete("/{id}")
def delete_room(id: int, db: Session = Depends(get_db),
                current_user: models.User = Depends(auth.get_current_user)):
    require_admin_or_pm(current_user)
    row = db.query(models.Room).filter(models.Room.id == id).first()
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}
