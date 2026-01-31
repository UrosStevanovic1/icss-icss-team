# api/routers/auth_routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=schemas.Token)
def login(form_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.email).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email/password")

    safe_lec_id = user.lecturer_id if user.lecturer_id is not None else 0

    access_token = auth.create_access_token(data={
        "sub": user.email,
        "role": user.role,
        "lecturer_id": safe_lec_id
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "lecturer_id": user.lecturer_id
    }

@router.get("/me")
def me(current_user: models.User = Depends(auth.get_current_user)):
    return {
        "email": current_user.email,
        "role": current_user.role,
        "lecturer_id": current_user.lecturer_id
    }
