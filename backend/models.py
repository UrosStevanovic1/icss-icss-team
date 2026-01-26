from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from database import Base

class ConstraintType(Base):
    __tablename__ = "constraint_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), unique=True, nullable=False)
    active = Column(Boolean, nullable=False, server_default="true")
    constraint_level = Column(String, nullable=True)
    constraint_format = Column(String, nullable=True)
    constraint_rule = Column(Text, nullable=True)
    constraint_target = Column(String, nullable=True)

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

class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column("Name", String(100), nullable=False)
    size = Column("Size", Integer, nullable=False)
    description = Column("Brief description", String(250), nullable=True)
    email = Column("Email", String(200), nullable=True)
    program = Column("Program", String, nullable=True)
    parent_group = Column("Parent_Group", String, nullable=True)

class Lecturer(Base):
    __tablename__ = "lecturers"
    id = Column("ID", Integer, primary_key=True, index=True)
    first_name = Column(String(200), nullable=False)
    last_name = Column(String(200), nullable=True)
    title = Column(String(50), nullable=False)
    employment_type = Column(String(50), nullable=False)
    personal_email = Column(String(200), nullable=True)
    mdh_email = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    location = Column(String(200), nullable=True)
    teaching_load = Column(String(100), nullable=True)

class Module(Base):
    __tablename__ = "modules"
    module_code = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    ects = Column(Integer, nullable=False)
    room_type = Column(String, nullable=False)
    assessment_type = Column(String, nullable=True)
    semester = Column(Integer, nullable=False)
    category = Column(String, nullable=True)
    # NO STATUS COLUMN HERE
    program_id = Column(Integer, ForeignKey("study_programs.id"), nullable=True)
    specialization_id = Column(Integer, ForeignKey("specializations.id"), nullable=True)

class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    capacity = Column(Integer, nullable=False)
    type = Column(String, nullable=False)
    status = Column(Boolean, nullable=True)
    equipment = Column("Equipment", String, nullable=True)
    location = Column(String, nullable=True)

class StudyProgram(Base):
    __tablename__ = "study_programs"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    acronym = Column(String, nullable=False)
    head_of_program = Column(String, nullable=False)
    status = Column(Boolean, default=True)
    start_date = Column(String, nullable=False)
    total_ects = Column(Integer, nullable=False)
    location = Column(String(200), nullable=True)
    specializations = relationship("Specialization", back_populates="program", cascade="all, delete-orphan")

class Specialization(Base):
    __tablename__ = "specializations"
    id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey("study_programs.id"))
    name = Column(String, nullable=False)
    acronym = Column(String, nullable=False)
    start_date = Column(String, nullable=False)
    status = Column(Boolean, default=True)
    study_program = Column(String, nullable=True)
    program = relationship("StudyProgram", back_populates="specializations")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="student")