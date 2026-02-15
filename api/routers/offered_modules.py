from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel

from ..database import get_db
from .. import models, auth

router = APIRouter(prefix="/offered-modules", tags=["offered-modules"])

class OfferCreate(BaseModel):
    module_code: str
    lecturer_id: Optional[int] = None
    semester: str
    status: str = "Confirmed"

class OfferResponse(BaseModel):
    id: int
    module_code: str
    module_name: str
    lecturer_name: str
    semester: str
    status: str

    class Config:
        orm_mode = True

@router.get("/", response_model=List[OfferResponse])
def get_offers(semester: str = None, db: Session = Depends(get_db),
               current_user: models.User = Depends(auth.get_current_user)):
    query = db.query(models.OfferedModule).options(
        joinedload(models.OfferedModule.module),
        joinedload(models.OfferedModule.lecturer)
    )
    if semester:
        query = query.filter(models.OfferedModule.semester == semester)

    results = query.all()

    mapped = []
    for r in results:
        mapped.append({
            "id": r.id,
            "module_code": r.module_code,
            "module_name": r.module.name if r.module else "Unknown Module",
            "lecturer_name": f"{r.lecturer.first_name} {r.lecturer.last_name}" if r.lecturer else "Unassigned",
            "semester": r.semester,
            "status": r.status
        })
    return mapped

@router.post("/", response_model=OfferResponse)
def create_offer(offer: OfferCreate, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    exists = db.query(models.OfferedModule).filter(
        models.OfferedModule.module_code == offer.module_code,
        models.OfferedModule.semester == offer.semester
    ).first()

    if exists:
        raise HTTPException(status_code=400, detail="This module is already offered in this semester")

    new_offer = models.OfferedModule(**offer.dict())
    db.add(new_offer)
    db.commit()
    db.refresh(new_offer)

    return {
        "id": new_offer.id,
        "module_code": new_offer.module_code,
        "module_name": "Just Added",
        "lecturer_name": "Check List",
        "semester": new_offer.semester,
        "status": new_offer.status
    }

@router.delete("/{id}")
def delete_offer(id: int, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    item = db.query(models.OfferedModule).filter(models.OfferedModule.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")

    db.delete(item)
    db.commit()
    return {"ok": True}