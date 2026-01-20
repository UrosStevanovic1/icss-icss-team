from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from database import Base
# backend/models.py
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

# ... tus imports y modelos arriba ...

class Availability(Base):
    __tablename__ = "availabilities"

    id = Column(Integer, primary_key=True, index=True)
    lecturer_id = Column(Integer, ForeignKey("lecturers.id"), nullable=False)

    day_of_week = Column(String, nullable=False)     # "Monday", "Tuesday", etc.
    start_time = Column(String, nullable=False)      # "09:00"
    end_time = Column(String, nullable=False)        # "11:00"
    is_active = Column(Boolean, default=True)

    lecturer = relationship("Lecturer")


class StudyProgram(Base):
    __tablename__ = "study_programs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    acronym = Column(String, nullable=False)
    head_of_program = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    start_date = Column(String, nullable=False)
    total_ects = Column(Integer, nullable=False)

    specializations = relationship(
        "Specialization",
        back_populates="program",
        cascade="all, delete-orphan"
    )


class Specialization(Base):
    __tablename__ = "specializations"

    id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey("study_programs.id"))

    name = Column(String, nullable=False)
    acronym = Column(String, nullable=False)
    start_date = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    program = relationship("StudyProgram", back_populates="specializations")


class Module(Base):
    __tablename__ = "modules"

    module_id = Column(Integer, primary_key=True, index=True)
    module_name = Column(String, nullable=False)
    room_type = Column(String, nullable=False)
    sessions_per_week = Column(Integer, nullable=False)
    semester = Column(Integer, nullable=False)
    total_sessions = Column(Integer, nullable=False)
    class_duration = Column(Integer, nullable=False)
    number_of_students = Column(Integer, nullable=False)
    onsite_online = Column(String, nullable=False)


class Lecturer(Base):
    __tablename__ = "lecturers"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200), nullable=False)
    domain = Column(String(200), nullable=False)
    employment_type = Column(String(50), nullable=False)
    personal_email = Column(String(200), nullable=True)
    mdh_email = Column(String(200), nullable=True)
    #phone = Column(String(50), nullable=True)


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    group_name = Column(String(100), nullable=False)
    size = Column(Integer, nullable=False)
    description = Column(String(250), nullable=True)
    email = Column(String(200), nullable=True)


# =========================================================
# SCHEDULER CONSTRAINTS
# =========================================================

class ConstraintType(Base):
    __tablename__ = "constraint_types"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(80), unique=True, nullable=False)
    description = Column(Text, nullable=False)
    default_hardness = Column(String(10), nullable=False)
    is_active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime, nullable=False, server_default=func.now())


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    capacity = Column(Integer, nullable=False)
    type = Column(String, nullable=False)  #  Lecture, Lab, Seminar
    available = Column(Boolean, default=True, nullable=False)


class SchedulerConstraint(Base):
    __tablename__ = "scheduler_constraints"
    id = Column(Integer, primary_key=True, index=True)
    constraint_type_id = Column(Integer, ForeignKey("constraint_types.id"), nullable=False)
    hardness = Column(String(10), nullable=False)
    weight = Column(Integer, nullable=True)
    scope = Column(String(20), nullable=False)
    target_id = Column(Integer, nullable=True)
    config = Column(JSONB, nullable=False, server_default="{}")
    is_enabled = Column(Boolean, nullable=False, server_default="true")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())