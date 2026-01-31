from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, Table, Date
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from .database import Base

# Association Table for Many-to-Many (Modules <-> Specializations)
module_specializations = Table(
    "module_specializations",
    Base.metadata,
    Column("module_code", String, ForeignKey("modules.module_code"), primary_key=True),
    Column("specialization_id", Integer, ForeignKey("specializations.id"), primary_key=True),
)


class StudyProgram(Base):
    __tablename__ = "study_programs"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    acronym = Column(String, nullable=False)
    head_of_program = Column(String, nullable=False)
    status = Column(Boolean, default=True)
    start_date = Column(String, nullable=False)
    total_ects = Column(Integer, nullable=False)
    location = Column(String, nullable=True)
    level = Column(String, nullable=False, server_default="Bachelor")

    # Relationships
    specializations = relationship("Specialization", back_populates="program", cascade="all, delete-orphan")
    modules = relationship("Module", back_populates="program")


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
    modules = relationship("Module", secondary=module_specializations, back_populates="specializations")


class Module(Base):
    __tablename__ = "modules"
    module_code = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    ects = Column(Integer, nullable=False)
    room_type = Column(String, nullable=False)
    assessment_type = Column(String, nullable=True)
    semester = Column(Integer, nullable=False)
    category = Column(String, nullable=True)

    # Linking to Study Program
    program_id = Column(Integer, ForeignKey("study_programs.id"), nullable=True)

    program = relationship("StudyProgram", back_populates="modules")
    specializations = relationship("Specialization", secondary=module_specializations, back_populates="modules")


class Lecturer(Base):
    __tablename__ = "lecturers"
    # ✅ FIX: Map to uppercase "ID" from database
    id = Column("ID", Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=True)
    title = Column(String, nullable=False)
    employment_type = Column(String, nullable=False)
    personal_email = Column(String, nullable=True)
    mdh_email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    teaching_load = Column(String, nullable=True)


class LecturerAvailability(Base):
    __tablename__ = "lecturer_availabilities"
    id = Column(Integer, primary_key=True, index=True)
    # Refers to "lecturers.ID" because of the mapping above
    lecturer_id = Column(Integer, ForeignKey("lecturers.ID"), unique=True, nullable=False)
    schedule_data = Column(JSONB, nullable=False, server_default='{}')


class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    # ✅ FIX: Map to capitalized column names
    name = Column("Name", String, nullable=False)
    size = Column("Size", Integer, nullable=False)
    description = Column("Brief description", String, nullable=True)
    email = Column("Email", String, nullable=True)
    program = Column("Program", String, nullable=True)
    parent_group = Column("Parent_Group", String, nullable=True)


class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    capacity = Column(Integer, nullable=False)
    type = Column(String, nullable=False)
    status = Column(Boolean, nullable=False)
    # ✅ FIX: Map to "Equipment"
    equipment = Column("Equipment", String, nullable=True)
    location = Column(String, nullable=True)


class ConstraintType(Base):
    __tablename__ = "constraint_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    # Note: Using "active" here. If DB has "is_active", change first arg to "is_active"
    active = Column(Boolean, nullable=False, default=True)
    constraint_level = Column(String, nullable=True)
    constraint_format = Column(String, nullable=True)
    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)
    constraint_rule = Column(Text, nullable=True)
    constraint_target = Column(String, nullable=True)


class SchedulerConstraint(Base):
    __tablename__ = "scheduler_constraints"
    id = Column(Integer, primary_key=True, index=True)
    constraint_type_id = Column(Integer, ForeignKey("constraint_types.id"), nullable=False)
    hardness = Column(String, nullable=False)
    weight = Column(Integer, nullable=True)
    scope = Column(String, nullable=False)
    target_id = Column(Integer, nullable=True)
    config = Column(JSONB, nullable=False, server_default='{}')
    is_enabled = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)

    constraint_type = relationship("ConstraintType")