# api/routers/groups.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas, auth
from ..permissions import role_of, is_admin_or_pm, group_payload_in_hosp_domain, group_is_in_hosp_domain

router = APIRouter(prefix="/groups", tags=["groups"])

@router.get("/", response_model=List[schemas.GroupResponse])
def read_groups(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Group).all()

@router.post("/", response_model=schemas.GroupResponse)
def create_group(p: schemas.GroupCreate, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    r = role_of(current_user)
    if is_admin_or_pm(current_user):
        pass
    elif r == "hosp":
        if not group_payload_in_hosp_domain(db, current_user, p.program):
            raise HTTPException(status_code=403, detail="Unauthorized for this program")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    row = models.Group(**p.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.put("/{id}", response_model=schemas.GroupResponse)
def update_group(id: int, p: schemas.GroupUpdate, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    row = db.query(models.Group).filter(models.Group.id == id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Group not found")

    r = role_of(current_user)
    if is_admin_or_pm(current_user):
        pass
    elif r == "hosp":
        if not group_is_in_hosp_domain(db, current_user, row):
            raise HTTPException(status_code=403, detail="Unauthorized for this program")
        if p.program is not None and not group_payload_in_hosp_domain(db, current_user, p.program):
            raise HTTPException(status_code=403, detail="Cannot move group to another program")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    data = p.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)

    db.commit()
    db.refresh(row)
    return row

@router.delete("/{id}")
def delete_group(id: int, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    row = db.query(models.Group).filter(models.Group.id == id).first()
    if not row:
        return {"ok": True}

    r = role_of(current_user)
    if is_admin_or_pm(current_user):
        pass
    elif r == "hosp":
        if not group_is_in_hosp_domain(db, current_user, row):
            raise HTTPException(status_code=403, detail="Unauthorized for this program")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(row)
    db.commit()
    return {"ok": True}
