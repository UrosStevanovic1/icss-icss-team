from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

# RELATIVE IMPORTS
from . import models
from . import schemas
from . import auth
from .database import engine, get_db

# Initialize DB Tables
try:
    models.Base.metadata.create_all(bind=engine)
    print("✅ DB connected.")
except Exception as e:
    print("❌ DB Startup Error:", e)

app = FastAPI(title="Study Program Backend", root_path="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Backend Online"}


# --- 🛠️ SMART SEED & MIGRATION ENDPOINT ---
@app.get("/seed")
def seed_users(db: Session = Depends(get_db)):
    log = []
    # 1. PM/Admin User
    if not db.query(models.User).filter(models.User.email == "pm@icss.com").first():
        hashed = auth.get_password_hash("password")
        db.add(models.User(email="pm@icss.com", password_hash=hashed, role="pm"))
        log.append("✅ PM User Created")

    # 2. HoSP User (Mohammed ID 1)
    if not db.query(models.User).filter(models.User.email == "hosp@icss.com").first():
        hashed = auth.get_password_hash("password")
        db.add(models.User(email="hosp@icss.com", password_hash=hashed, role="hosp", lecturer_id=1))
        log.append("✅ HoSP User Created")

    db.commit()
    return {"status": "Complete", "changes": log}


# --- HELPER: Permission Checks ---
def check_admin_or_pm(user: models.User):
    if user.role.lower() not in ["admin", "pm"]:
        raise HTTPException(status_code=403, detail="Admin/PM privileges required")


def check_is_hosp_for_program(user: models.User, program: models.StudyProgram):
    role = user.role.lower()
    if role in ["admin", "pm"]:
        return True
    if role == "hosp":
        if not program:
            raise HTTPException(404)
        if user.lecturer_id != program.head_of_program_id:
            raise HTTPException(status_code=403, detail="Unauthorized for this program")
        return True
    raise HTTPException(403, detail="Access denied")


# --- AUTH ---
@app.post("/auth/login", response_model=schemas.Token)
def login(form_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.email).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email/password")

    # ✅ FIX: Handle case where lecturer_id is NULL for PM/Admin
    safe_lec_id = user.lecturer_id if user.lecturer_id is not None else 0

    access_token = auth.create_access_token(data={
        "sub": user.email,
        "role": user.role,
        "lecturer_id": safe_lec_id
    })

    # ✅ IMPORTANT: Return lecturer_id to frontend
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "lecturer_id": user.lecturer_id
    }


# --- PROGRAMS ---
@app.get("/study-programs/", response_model=List[schemas.StudyProgramResponse])
def read_programs(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.StudyProgram).options(joinedload(models.StudyProgram.head_lecturer)).all()


@app.post("/study-programs/", response_model=schemas.StudyProgramResponse)
def create_program(p: schemas.StudyProgramCreate, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    check_admin_or_pm(current_user)
    row = models.StudyProgram(**p.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.put("/study-programs/{id}", response_model=schemas.StudyProgramResponse)
def update_program(id: int, p: schemas.StudyProgramCreate, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    row = db.query(models.StudyProgram).filter(models.StudyProgram.id == id).first()
    if not row:
        raise HTTPException(404)

    check_is_hosp_for_program(current_user, row)

    for k, v in p.model_dump().items():
        setattr(row, k, v)

    db.commit()
    db.refresh(row)
    return row


@app.delete("/study-programs/{id}")
def delete_program(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    check_admin_or_pm(current_user)
    row = db.query(models.StudyProgram).filter(models.StudyProgram.id == id).first()
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}


# --- LECTURERS ---
@app.get("/lecturers/", response_model=List[schemas.LecturerResponse])
def read_lecturers(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Lecturer).all()


# --- MODULES ---
@app.get("/modules/", response_model=List[schemas.ModuleResponse])
def read_modules(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Module).options(joinedload(models.Module.specializations)).all()


# --- SPECIALIZATIONS ---
@app.get("/specializations/", response_model=List[schemas.SpecializationResponse])
def read_specs(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Specialization).all()


# --- GROUPS ---
@app.get("/groups/", response_model=List[schemas.GroupResponse])
def read_groups(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Group).all()


# --- ROOMS ---
@app.get("/rooms/", response_model=List[schemas.RoomResponse])
def read_rooms(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Room).all()


# --- AVAILABILITY ---
@app.post("/availabilities/update")
def update_availability(payload: schemas.AvailabilityUpdate, db: Session = Depends(get_db),
                        current_user: models.User = Depends(auth.get_current_user)):
    role = current_user.role.lower()
    if role == "lecturer" and current_user.lecturer_id != payload.lecturer_id:
        raise HTTPException(403)

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


# --- CONSTRAINTS ---
@app.get("/scheduler-constraints/", response_model=List[schemas.SchedulerConstraintResponse])
def read_scheduler_constraints(db: Session = Depends(get_db),
                               current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.SchedulerConstraint).all()
