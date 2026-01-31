# api/routers/constraints.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas, auth
from ..permissions import role_of, is_admin_or_pm, hosp_can_manage_constraint

router = APIRouter(tags=["constraints"])

# ---- constraint types ----
@router.get("/constraint-types/", response_model=List[schemas.ConstraintTypeResponse])
def read_constraint_types(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.ConstraintType).all()

# ---- scheduler constraints ----
@router.get("/scheduler-constraints/", response_model=List[schemas.SchedulerConstraintResponse])
def read_scheduler_constraints(db: Session = Depends(get_db),
                               current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.SchedulerConstraint).all()

@router.post("/scheduler-constraints/", response_model=schemas.SchedulerConstraintResponse)
def create_scheduler_constraint(p: schemas.SchedulerConstraintCreate, db: Session = Depends(get_db),
                                current_user: models.User = Depends(auth.get_current_user)):
    r = role_of(current_user)
    if is_admin_or_pm(current_user):
        pass
    elif r == "hosp":
        if not hosp_can_manage_constraint(db, current_user, p.scope, p.target_id):
            raise HTTPException(status_code=403, detail="HoSP can only manage Program-scoped constraints for their program")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    row = models.SchedulerConstraint(**p.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.put("/scheduler-constraints/{id}", response_model=schemas.SchedulerConstraintResponse)
def update_scheduler_constraint(id: int, p: schemas.SchedulerConstraintUpdate, db: Session = Depends(get_db),
                                current_user: models.User = Depends(auth.get_current_user)):
    row = db.query(models.SchedulerConstraint).filter(models.SchedulerConstraint.id == id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Constraint not found")

    r = role_of(current_user)
    if is_admin_or_pm(current_user):
        pass
    elif r == "hosp":
        if not hosp_can_manage_constraint(db, current_user, row.scope, row.target_id):
            raise HTTPException(status_code=403, detail="Unauthorized")

        new_scope = p.scope if p.scope is not None else row.scope
        new_target = p.target_id if p.target_id is not None else row.target_id
        if not hosp_can_manage_constraint(db, current_user, new_scope, new_target):
            raise HTTPException(status_code=403, detail="Cannot move constraint out of program scope")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    data = p.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)

    db.commit()
    db.refresh(row)
    return row

@router.delete("/scheduler-constraints/{id}")
def delete_scheduler_constraint(id: int, db: Session = Depends(get_db),
                                current_user: models.User = Depends(auth.get_current_user)):
    row = db.query(models.SchedulerConstraint).filter(models.SchedulerConstraint.id == id).first()
    if not row:
        return {"ok": True}

    r = role_of(current_user)
    if is_admin_or_pm(current_user):
        pass
    elif r == "hosp":
        if not hosp_can_manage_constraint(db, current_user, row.scope, row.target_id):
            raise HTTPException(status_code=403, detail="Unauthorized")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(row)
    db.commit()
    return {"ok": True}
