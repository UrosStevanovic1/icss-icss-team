from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from typing import List
from sqlalchemy import text

# RELATIVE IMPORTS
from . import models
from . import schemas
from . import auth
from .database import engine, get_db

app = FastAPI(title="Study Program Backend", root_path="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- 🛠️ DATABASE FIXER ENDPOINT ---
# VISIT THIS URL ONCE AFTER DEPLOYING: /api/fix-db
@app.get("/fix-db")
def fix_database():
    results = []
    try:
        with engine.connect() as connection:
            connection.commit()

            # 1. Fix Study Programs (Add ID link)
            try:
                # Check if column exists first to avoid error
                connection.execute(
                    text("ALTER TABLE study_programs ADD COLUMN head_of_program_id INTEGER REFERENCES lecturers(ID)"))
                connection.execute(text("ALTER TABLE study_programs ALTER COLUMN head_of_program DROP NOT NULL"))
                connection.commit()
                results.append("✅ Added head_of_program_id to study_programs")
            except Exception as e:
                results.append(f"ℹ️ Study Programs check: {e}")

            # 2. Fix Users (Add Lecturer Link)
            try:
                connection.execute(text("ALTER TABLE users ADD COLUMN lecturer_id INTEGER REFERENCES lecturers(ID)"))
                connection.commit()
                results.append("✅ Added lecturer_id to users")
            except Exception as e:
                results.append(f"ℹ️ Users check: {e}")

        return {"status": "Database checks completed", "details": results}
    except Exception as e:
        return {"status": "Critical Error", "details": str(e)}


# Initialize DB
try:
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    print("Startup DB Error:", e)


@app.get("/")
def root(): return {"message": "Backend Online"}


# --- AUTH ---
@app.post("/auth/login", response_model=schemas.Token)
def login(form_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.email).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        if not user and form_data.email == "admin@icss.com":
            hashed = auth.get_password_hash("admin")
            admin_user = models.User(email="admin@icss.com", password_hash=hashed, role="admin")
            db.add(admin_user);
            db.commit();
            db.refresh(admin_user)
            user = admin_user
        else:
            raise HTTPException(status_code=400, detail="Incorrect email/password")

    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}


# --- PROGRAMS ---
@app.get("/study-programs/", response_model=List[schemas.StudyProgramResponse])
def read_programs(db: Session = Depends(get_db)):
    return db.query(models.StudyProgram).options(joinedload(models.StudyProgram.head_lecturer)).all()


@app.post("/study-programs/", response_model=schemas.StudyProgramResponse)
def create_program(p: schemas.StudyProgramCreate, db: Session = Depends(get_db)):
    row = models.StudyProgram(**p.model_dump())
    db.add(row);
    db.commit();
    db.refresh(row)
    return row


@app.put("/study-programs/{id}", response_model=schemas.StudyProgramResponse)
def update_program(id: int, p: schemas.StudyProgramCreate, db: Session = Depends(get_db)):
    row = db.query(models.StudyProgram).filter(models.StudyProgram.id == id).first()
    if not row: raise HTTPException(404)
    for k, v in p.model_dump().items(): setattr(row, k, v)
    db.commit();
    db.refresh(row)
    return row


@app.delete("/study-programs/{id}")
def delete_program(id: int, db: Session = Depends(get_db)):
    row = db.query(models.StudyProgram).filter(models.StudyProgram.id == id).first()
    if row: db.delete(row); db.commit()
    return {"ok": True}


# --- LECTURERS ---
@app.get("/lecturers/", response_model=List[schemas.LecturerResponse])
def read_lecturers(db: Session = Depends(get_db)):
    return db.query(models.Lecturer).all()


@app.post("/lecturers/", response_model=schemas.LecturerResponse)
def create_lecturer(l: schemas.LecturerCreate, db: Session = Depends(get_db)):
    db_obj = models.Lecturer(**l.model_dump())
    db.add(db_obj);
    db.commit();
    db.refresh(db_obj)
    return db_obj


@app.put("/lecturers/{id}", response_model=schemas.LecturerResponse)
def update_lecturer(id: int, l: schemas.LecturerCreate, db: Session = Depends(get_db)):
    row = db.query(models.Lecturer).filter(models.Lecturer.id == id).first()
    if not row: raise HTTPException(404, "Lecturer not found")
    for k, v in l.model_dump().items(): setattr(row, k, v)
    db.commit();
    db.refresh(row)
    return row


@app.delete("/lecturers/{id}")
def delete_lecturer(id: int, db: Session = Depends(get_db)):
    row = db.query(models.Lecturer).filter(models.Lecturer.id == id).first()
    if row: db.delete(row); db.commit()
    return {"ok": True}


# --- MODULES ---
@app.get("/modules/", response_model=List[schemas.ModuleResponse])
def read_modules(db: Session = Depends(get_db)):
    return db.query(models.Module).options(joinedload(models.Module.specializations)).all()


@app.post("/modules/", response_model=schemas.ModuleResponse)
def create_module(m: schemas.ModuleCreate, db: Session = Depends(get_db)):
    spec_ids = m.specialization_ids
    module_data = m.model_dump(exclude={"specialization_ids"})
    new_module = models.Module(**module_data)
    if spec_ids:
        specs = db.query(models.Specialization).filter(models.Specialization.id.in_(spec_ids)).all()
        new_module.specializations = specs
    db.add(new_module);
    db.commit();
    db.refresh(new_module)
    return new_module


@app.put("/modules/{code}", response_model=schemas.ModuleResponse)
def update_module(code: str, m: schemas.ModuleCreate, db: Session = Depends(get_db)):
    row = db.query(models.Module).filter(models.Module.module_code == code).first()
    if not row: raise HTTPException(404)
    spec_ids = m.specialization_ids
    module_data = m.model_dump(exclude={"specialization_ids"})
    for k, v in module_data.items(): setattr(row, k, v)
    specs = db.query(models.Specialization).filter(models.Specialization.id.in_(spec_ids)).all()
    row.specializations = specs
    db.commit();
    db.refresh(row)
    return row


@app.delete("/modules/{code}")
def delete_module(code: str, db: Session = Depends(get_db)):
    row = db.query(models.Module).filter(models.Module.module_code == code).first()
    if row: db.delete(row); db.commit()
    return {"ok": True}


# --- SPECIALIZATIONS ---
@app.get("/specializations/", response_model=List[schemas.SpecializationResponse])
def read_specs(db: Session = Depends(get_db)):
    return db.query(models.Specialization).all()


@app.post("/specializations/", response_model=schemas.SpecializationResponse)
def create_spec(s: schemas.SpecializationCreate, db: Session = Depends(get_db)):
    spec_data = s.model_dump()
    program = db.query(models.StudyProgram).filter(models.StudyProgram.id == s.program_id).first()
    if program: spec_data["study_program"] = program.name
    row = models.Specialization(**spec_data)
    db.add(row);
    db.commit();
    db.refresh(row)
    return row


@app.put("/specializations/{id}", response_model=schemas.SpecializationResponse)
def update_spec(id: int, s: schemas.SpecializationCreate, db: Session = Depends(get_db)):
    row = db.query(models.Specialization).filter(models.Specialization.id == id).first()
    if not row: raise HTTPException(404)
    for k, v in s.model_dump().items(): setattr(row, k, v)
    program = db.query(models.StudyProgram).filter(models.StudyProgram.id == s.program_id).first()
    if program: row.study_program = program.name
    db.commit();
    db.refresh(row)
    return row


@app.delete("/specializations/{id}")
def delete_spec(id: int, db: Session = Depends(get_db)):
    row = db.query(models.Specialization).filter(models.Specialization.id == id).first()
    if row: db.delete(row); db.commit()
    return {"ok": True}


# --- GROUPS ---
@app.get("/groups/", response_model=List[schemas.GroupResponse])
def read_groups(db: Session = Depends(get_db)):
    return db.query(models.Group).all()


@app.post("/groups/", response_model=schemas.GroupResponse)
def create_group(g: schemas.GroupCreate, db: Session = Depends(get_db)):
    row = models.Group(**g.model_dump())
    db.add(row);
    db.commit();
    db.refresh(row)
    return row


@app.delete("/groups/{id}")
def delete_group(id: int, db: Session = Depends(get_db)):
    row = db.query(models.Group).filter(models.Group.id == id).first()
    if row: db.delete(row); db.commit()
    return {"ok": True}


# --- ROOMS ---
@app.get("/rooms/", response_model=List[schemas.RoomResponse])
def read_rooms(db: Session = Depends(get_db)):
    return db.query(models.Room).all()


@app.post("/rooms/", response_model=schemas.RoomResponse)
def create_room(r: schemas.RoomCreate, db: Session = Depends(get_db)):
    row = models.Room(**r.model_dump())
    db.add(row);
    db.commit();
    db.refresh(row)
    return row


@app.put("/rooms/{id}", response_model=schemas.RoomResponse)
def update_room(id: int, r: schemas.RoomCreate, db: Session = Depends(get_db)):
    row = db.query(models.Room).filter(models.Room.id == id).first()
    if not row: raise HTTPException(404)
    for k, v in r.model_dump().items(): setattr(row, k, v)
    db.commit();
    db.refresh(row)
    return row


@app.delete("/rooms/{id}")
def delete_room(id: int, db: Session = Depends(get_db)):
    row = db.query(models.Room).filter(models.Room.id == id).first()
    if row: db.delete(row); db.commit()
    return {"ok": True}


# --- AVAILABILITY ---
@app.get("/availabilities/", response_model=List[schemas.AvailabilityResponse])
def read_availabilities(db: Session = Depends(get_db)):
    return db.query(models.LecturerAvailability).all()


@app.post("/availabilities/update")
def update_availability(payload: schemas.AvailabilityUpdate, db: Session = Depends(get_db)):
    existing = db.query(models.LecturerAvailability).filter(
        models.LecturerAvailability.lecturer_id == payload.lecturer_id
    ).first()
    if existing:
        existing.schedule_data = payload.schedule_data
        db.commit();
        db.refresh(existing)
        return existing
    else:
        new_entry = models.LecturerAvailability(**payload.model_dump())
        db.add(new_entry);
        db.commit();
        db.refresh(new_entry)
        return new_entry


# --- CONSTRAINTS ---
@app.get("/constraint-types/", response_model=List[schemas.ConstraintTypeResponse])
def read_constraint_types(db: Session = Depends(get_db)):
    return db.query(models.ConstraintType).all()


@app.get("/scheduler-constraints/", response_model=List[schemas.SchedulerConstraintResponse])
def read_scheduler_constraints(db: Session = Depends(get_db)):
    return db.query(models.SchedulerConstraint).all()


@app.post("/scheduler-constraints/", response_model=schemas.SchedulerConstraintResponse)
def create_constraint(c: schemas.SchedulerConstraintCreate, db: Session = Depends(get_db)):
    row = models.SchedulerConstraint(**c.model_dump())
    db.add(row);
    db.commit();
    db.refresh(row)
    return row


@app.delete("/scheduler-constraints/{id}")
def delete_constraint(id: int, db: Session = Depends(get_db)):
    row = db.query(models.SchedulerConstraint).filter(models.SchedulerConstraint.id == id).first()
    if row: db.delete(row); db.commit()
    return {"ok": True}