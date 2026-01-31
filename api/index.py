from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

# RELATIVE IMPORTS
from . import models
from . import schemas
from . import auth
from .database import engine, get_db

# Initialize DB Tables (Standard SQLAlchemy check)
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
def root(): return {"message": "Backend Online"}


# --- 🛠️ SEED ENDPOINT (Create Test Users) ---
# Visit /api/seed in your browser ONCE to create the test users
@app.get("/seed")
def seed_users(db: Session = Depends(get_db)):
    created = []

    # 1. Create PM/Admin
    if not db.query(models.User).filter(models.User.email == "pm@icss.com").first():
        hashed = auth.get_password_hash("password")
        db.add(models.User(email="pm@icss.com", password_hash=hashed, role="pm"))
        created.append("PM User Created (pm@icss.com / password)")

    # 2. Create Dummy Lecturer Profile (Required for HoSP/Lecturer Users)
    lecturer = db.query(models.Lecturer).first()
    if not lecturer:
        lecturer = models.Lecturer(first_name="Prof", last_name="Test", title="Dr.", employment_type="Full time",
                                   mdh_email="prof@test.com")
        db.add(lecturer)
        db.commit()
        db.refresh(lecturer)
        created.append("Dummy Lecturer Profile Created")

    # 3. Create HoSP User (Linked to Lecturer)
    if not db.query(models.User).filter(models.User.email == "hosp@icss.com").first():
        hashed = auth.get_password_hash("password")
        # Link to the lecturer profile so HoSP logic works
        db.add(models.User(email="hosp@icss.com", password_hash=hashed, role="hosp", lecturer_id=lecturer.id))
        created.append("HoSP User Created (hosp@icss.com / password)")

    # 4. Create Lecturer User (Linked to same Lecturer for testing)
    if not db.query(models.User).filter(models.User.email == "lecturer@icss.com").first():
        hashed = auth.get_password_hash("password")
        db.add(models.User(email="lecturer@icss.com", password_hash=hashed, role="lecturer", lecturer_id=lecturer.id))
        created.append("Lecturer User Created (lecturer@icss.com / password)")

    # 5. Create Student User
    if not db.query(models.User).filter(models.User.email == "student@icss.com").first():
        hashed = auth.get_password_hash("password")
        db.add(models.User(email="student@icss.com", password_hash=hashed, role="student"))
        created.append("Student User Created (student@icss.com / password)")

    db.commit()
    return {"status": "Seeding Complete", "created": created}


# --- HELPER: Permission Checks ---
def check_admin_or_pm(user: models.User):
    if user.role not in ["admin", "pm"]:
        raise HTTPException(status_code=403, detail="Admin or PM privileges required")


def check_is_hosp_for_program(user: models.User, program: models.StudyProgram):
    """
    Allows access if user is Admin/PM OR if user is the HoSP of this specific program.
    """
    if user.role in ["admin", "pm"]:
        return True

    if user.role == "hosp":
        if not program:
            raise HTTPException(status_code=404, detail="Program context missing")
        # Check if the logged-in user (linked to a lecturer profile) matches the program head
        if not user.lecturer_id or user.lecturer_id != program.head_of_program_id:
            raise HTTPException(status_code=403, detail="You can only edit programs you lead.")
        return True

    raise HTTPException(status_code=403, detail="Permission denied")


# --- AUTH ---
@app.post("/auth/login", response_model=schemas.Token)
def login(form_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.email).first()

    # Verify password (or backdoor for initial admin setup)
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

    # Create Token with Role & Lecturer ID for permission logic
    access_token = auth.create_access_token(data={
        "sub": user.email,
        "role": user.role,
        "lecturer_id": user.lecturer_id
    })
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}


# --- PROGRAMS ---
@app.get("/study-programs/", response_model=List[schemas.StudyProgramResponse])
def read_programs(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Everyone can read programs
    return db.query(models.StudyProgram).options(joinedload(models.StudyProgram.head_lecturer)).all()


@app.post("/study-programs/", response_model=schemas.StudyProgramResponse)
def create_program(p: schemas.StudyProgramCreate, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    check_admin_or_pm(current_user)  # Only Admin/PM can create new programs
    row = models.StudyProgram(**p.model_dump())
    db.add(row);
    db.commit();
    db.refresh(row)
    return row


@app.put("/study-programs/{id}", response_model=schemas.StudyProgramResponse)
def update_program(id: int, p: schemas.StudyProgramCreate, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    row = db.query(models.StudyProgram).filter(models.StudyProgram.id == id).first()
    if not row: raise HTTPException(404)

    # ✅ SECURITY: HoSP can only edit their OWN program
    check_is_hosp_for_program(current_user, row)

    for k, v in p.model_dump().items(): setattr(row, k, v)
    db.commit();
    db.refresh(row)
    return row


@app.delete("/study-programs/{id}")
def delete_program(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    check_admin_or_pm(current_user)  # Only Admin/PM can delete programs
    row = db.query(models.StudyProgram).filter(models.StudyProgram.id == id).first()
    if row: db.delete(row); db.commit()
    return {"ok": True}


# --- LECTURERS ---
@app.get("/lecturers/", response_model=List[schemas.LecturerResponse])
def read_lecturers(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Lecturer).all()


@app.post("/lecturers/", response_model=schemas.LecturerResponse)
def create_lecturer(l: schemas.LecturerCreate, db: Session = Depends(get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    check_admin_or_pm(current_user)
    db_obj = models.Lecturer(**l.model_dump())
    db.add(db_obj);
    db.commit();
    db.refresh(db_obj)
    return db_obj


@app.put("/lecturers/{id}", response_model=schemas.LecturerResponse)
def update_lecturer(id: int, l: schemas.LecturerCreate, db: Session = Depends(get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    row = db.query(models.Lecturer).filter(models.Lecturer.id == id).first()
    if not row: raise HTTPException(404, "Lecturer not found")

    # ✅ SECURITY: Lecturer Logic
    if current_user.role == "lecturer":
        if current_user.lecturer_id != id:
            raise HTTPException(403, "You can only update your own profile")

        # RESTRICTED UPDATE: Only allow email/phone for self-update
        if l.personal_email: row.personal_email = l.personal_email
        if l.phone: row.phone = l.phone
        # We purposely ignore changes to title/salary/name here for security
        db.commit();
        db.refresh(row)
        return row

    # Admin/PM can update everything
    check_admin_or_pm(current_user)
    for k, v in l.model_dump().items(): setattr(row, k, v)
    db.commit();
    db.refresh(row)
    return row


@app.delete("/lecturers/{id}")
def delete_lecturer(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    check_admin_or_pm(current_user)
    row = db.query(models.Lecturer).filter(models.Lecturer.id == id).first()
    if row: db.delete(row); db.commit()
    return {"ok": True}


# --- MODULES ---
@app.get("/modules/", response_model=List[schemas.ModuleResponse])
def read_modules(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Students/Lecturers: In future, filter this query. Currently Global Read.
    return db.query(models.Module).options(joinedload(models.Module.specializations)).all()


@app.post("/modules/", response_model=schemas.ModuleResponse)
def create_module(m: schemas.ModuleCreate, db: Session = Depends(get_db),
                  current_user: models.User = Depends(auth.get_current_user)):
    # HoSP Check: Can only create modules for THEIR program
    if current_user.role == "hosp":
        if not m.program_id: raise HTTPException(403, "HoSP must link module to a program")
        program = db.query(models.StudyProgram).filter(models.StudyProgram.id == m.program_id).first()
        check_is_hosp_for_program(current_user, program)
    elif current_user.role not in ["admin", "pm"]:
        raise HTTPException(403, "Not permitted")

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
def update_module(code: str, m: schemas.ModuleCreate, db: Session = Depends(get_db),
                  current_user: models.User = Depends(auth.get_current_user)):
    row = db.query(models.Module).filter(models.Module.module_code == code).first()
    if not row: raise HTTPException(404)

    # HoSP Check
    if current_user.role == "hosp":
        # Check rights on the EXISTING program of the module
        if row.program_id:
            program = db.query(models.StudyProgram).filter(models.StudyProgram.id == row.program_id).first()
            check_is_hosp_for_program(current_user, program)
        else:
            # If module has no program, HoSP cannot touch it
            raise HTTPException(403, "HoSP cannot edit global modules")

        # Also check rights on the NEW program if they are trying to move it
        if m.program_id and m.program_id != row.program_id:
            new_program = db.query(models.StudyProgram).filter(models.StudyProgram.id == m.program_id).first()
            check_is_hosp_for_program(current_user, new_program)

    elif current_user.role not in ["admin", "pm"]:
        raise HTTPException(403, "Not permitted")

    spec_ids = m.specialization_ids
    module_data = m.model_dump(exclude={"specialization_ids"})
    for k, v in module_data.items(): setattr(row, k, v)
    specs = db.query(models.Specialization).filter(models.Specialization.id.in_(spec_ids)).all()
    row.specializations = specs
    db.commit();
    db.refresh(row)
    return row


@app.delete("/modules/{code}")
def delete_module(code: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    row = db.query(models.Module).filter(models.Module.module_code == code).first()
    if not row: return {"ok": True}

    if current_user.role == "hosp":
        if row.program_id:
            program = db.query(models.StudyProgram).filter(models.StudyProgram.id == row.program_id).first()
            check_is_hosp_for_program(current_user, program)
        else:
            raise HTTPException(403, "HoSP cannot delete global modules")
    elif current_user.role not in ["admin", "pm"]:
        raise HTTPException(403, "Not permitted")

    db.delete(row);
    db.commit()
    return {"ok": True}


# --- SPECIALIZATIONS ---
@app.get("/specializations/", response_model=List[schemas.SpecializationResponse])
def read_specs(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Specialization).all()


@app.post("/specializations/", response_model=schemas.SpecializationResponse)
def create_spec(s: schemas.SpecializationCreate, db: Session = Depends(get_db),
                current_user: models.User = Depends(auth.get_current_user)):
    # HoSP Security
    program = db.query(models.StudyProgram).filter(models.StudyProgram.id == s.program_id).first()
    if not program: raise HTTPException(404, "Program not found")
    check_is_hosp_for_program(current_user, program)

    spec_data = s.model_dump()
    spec_data["study_program"] = program.name
    row = models.Specialization(**spec_data)
    db.add(row);
    db.commit();
    db.refresh(row)
    return row


@app.put("/specializations/{id}", response_model=schemas.SpecializationResponse)
def update_spec(id: int, s: schemas.SpecializationCreate, db: Session = Depends(get_db),
                current_user: models.User = Depends(auth.get_current_user)):
    row = db.query(models.Specialization).filter(models.Specialization.id == id).first()
    if not row: raise HTTPException(404)

    # Check rights on the PARENT program
    program = db.query(models.StudyProgram).filter(models.StudyProgram.id == s.program_id).first()
    check_is_hosp_for_program(current_user, program)

    for k, v in s.model_dump().items(): setattr(row, k, v)
    row.study_program = program.name
    db.commit();
    db.refresh(row)
    return row


@app.delete("/specializations/{id}")
def delete_spec(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    row = db.query(models.Specialization).filter(models.Specialization.id == id).first()
    if row:
        # Check rights
        program = db.query(models.StudyProgram).filter(models.StudyProgram.id == row.program_id).first()
        if program: check_is_hosp_for_program(current_user, program)
        db.delete(row);
        db.commit()
    return {"ok": True}


# --- GROUPS ---
@app.get("/groups/", response_model=List[schemas.GroupResponse])
def read_groups(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Group).all()


@app.post("/groups/", response_model=schemas.GroupResponse)
def create_group(g: schemas.GroupCreate, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    # HoSP logic could be added here if Groups had a program_id FK (currently string)
    # For now, restrict to Admin/PM/HoSP general
    if current_user.role == "student": raise HTTPException(403)
    row = models.Group(**g.model_dump())
    db.add(row);
    db.commit();
    db.refresh(row)
    return row


@app.delete("/groups/{id}")
def delete_group(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role == "student": raise HTTPException(403)
    row = db.query(models.Group).filter(models.Group.id == id).first()
    if row: db.delete(row); db.commit()
    return {"ok": True}


# --- ROOMS ---
@app.get("/rooms/", response_model=List[schemas.RoomResponse])
def read_rooms(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Room).all()


@app.post("/rooms/", response_model=schemas.RoomResponse)
def create_room(r: schemas.RoomCreate, db: Session = Depends(get_db),
                current_user: models.User = Depends(auth.get_current_user)):
    check_admin_or_pm(current_user)
    row = models.Room(**r.model_dump())
    db.add(row);
    db.commit();
    db.refresh(row)
    return row


@app.put("/rooms/{id}", response_model=schemas.RoomResponse)
def update_room(id: int, r: schemas.RoomCreate, db: Session = Depends(get_db),
                current_user: models.User = Depends(auth.get_current_user)):
    check_admin_or_pm(current_user)
    row = db.query(models.Room).filter(models.Room.id == id).first()
    if not row: raise HTTPException(404)
    for k, v in r.model_dump().items(): setattr(row, k, v)
    db.commit();
    db.refresh(row)
    return row


@app.delete("/rooms/{id}")
def delete_room(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    check_admin_or_pm(current_user)
    row = db.query(models.Room).filter(models.Room.id == id).first()
    if row: db.delete(row); db.commit()
    return {"ok": True}


# --- AVAILABILITY ---
@app.get("/availabilities/", response_model=List[schemas.AvailabilityResponse])
def read_availabilities(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.LecturerAvailability).all()


@app.post("/availabilities/update")
def update_availability(payload: schemas.AvailabilityUpdate, db: Session = Depends(get_db),
                        current_user: models.User = Depends(auth.get_current_user)):
    # ✅ SECURITY: Lecturer can only change OWN availability
    if current_user.role == "lecturer":
        if current_user.lecturer_id != payload.lecturer_id:
            raise HTTPException(403, "You can only edit your own availability")
    elif current_user.role not in ["admin", "pm"]:
        raise HTTPException(403, "Not permitted")

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


# --- CONSTRAINTS (Admin/PM Only) ---
@app.get("/constraint-types/", response_model=List[schemas.ConstraintTypeResponse])
def read_constraint_types(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.ConstraintType).all()


@app.get("/scheduler-constraints/", response_model=List[schemas.SchedulerConstraintResponse])
def read_scheduler_constraints(db: Session = Depends(get_db),
                               current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.SchedulerConstraint).all()


@app.post("/scheduler-constraints/", response_model=schemas.SchedulerConstraintResponse)
def create_constraint(c: schemas.SchedulerConstraintCreate, db: Session = Depends(get_db),
                      current_user: models.User = Depends(auth.get_current_user)):
    # Simplified: Only Admin/PM for now
    check_admin_or_pm(current_user)
    row = models.SchedulerConstraint(**c.model_dump())
    db.add(row);
    db.commit();
    db.refresh(row)
    return row


@app.delete("/scheduler-constraints/{id}")
def delete_constraint(id: int, db: Session = Depends(get_db),
                      current_user: models.User = Depends(auth.get_current_user)):
    check_admin_or_pm(current_user)
    row = db.query(models.SchedulerConstraint).filter(models.SchedulerConstraint.id == id).first()
    if row: db.delete(row); db.commit()
    return {"ok": True}