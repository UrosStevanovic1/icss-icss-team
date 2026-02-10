from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Date,
    ForeignKey,
    Text,
    JSON,
    TIMESTAMP,
    Table,
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

# ------------------------------------------------------------
# ASSOCIATION TABLES
# ------------------------------------------------------------

# Many-to-Many: Modules <-> Specializations
module_specializations = Table(
    "module_specializations",
    Base.metadata,
    Column("module_code", String, ForeignKey("modules.module_code", ondelete="CASCADE"), primary_key=True),
    Column("specialization_id", Integer, ForeignKey("specializations.id", ondelete="CASCADE"), primary_key=True),
)

# Many-to-Many: Lecturers <-> Modules (exists in DB)
lecturer_modules = Table(
    "lecturer_modules",
    Base.metadata,
    Column("lecturer_id", Integer, ForeignKey("lecturers.ID", ondelete="CASCADE"), primary_key=True),
    Column("module_code", String, ForeignKey("modules.module_code", ondelete="CASCADE"), primary_key=True),
)


# ------------------------------------------------------------
# CORE MODELS
# ------------------------------------------------------------

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # admin, pm, hosp, lecturer, student
    lecturer_id = Column(Integer, ForeignKey("lecturers.ID"), nullable=True)

    lecturer_profile = relationship("Lecturer")


class Domain(Base):
    """
    Domain table (used in your project to store reusable domain labels).
    """
    __tablename__ = "domains"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, nullable=False)


class Lecturer(Base):
    __tablename__ = "lecturers"
    # SQL Schema uses capitalized "ID"
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

    # Keep relationship mapped (DB has lecturer_modules)
    modules = relationship("Module", secondary=lecturer_modules, back_populates="lecturers")

    @property
    def domain(self) -> str | None:
        """
        Computed domain from mdh_email (since DB might not store domain_id).
        This prevents DB schema changes and still gives frontend a domain field.
        Example: anna@mdh.de -> "mdh.de"
        """
        if not self.mdh_email or "@" not in self.mdh_email:
            return None
        return self.mdh_email.split("@", 1)[1].strip().lower() or None


class StudyProgram(Base):
    __tablename__ = "study_programs"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    acronym = Column(String, nullable=False)
    status = Column(Boolean, default=True)
    start_date = Column(String, nullable=False)
    total_ects = Column(Integer, nullable=False)
    location = Column(String(200), nullable=True)
    level = Column(String(50), default="Bachelor")
    degree_type = Column(String, nullable=True)
    head_of_program_id = Column(Integer, ForeignKey("lecturers.ID"), nullable=True)

    head_lecturer = relationship("Lecturer")


class Module(Base):
    __tablename__ = "modules"
    module_code = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    ects = Column(Integer, nullable=False)
    room_type = Column(String, nullable=False)
    assessment_type = Column(String, nullable=True)
    semester = Column(Integer, nullable=False)
    category = Column(String, nullable=True)
    program_id = Column(Integer, ForeignKey("study_programs.id"), nullable=True)

    specializations = relationship("Specialization", secondary=module_specializations, back_populates="modules")
    lecturers = relationship("Lecturer", secondary=lecturer_modules, back_populates="modules")


class Specialization(Base):
    __tablename__ = "specializations"
    id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey("study_programs.id"))
    name = Column(String, nullable=False)
    acronym = Column(String, nullable=False)
    start_date = Column(String, nullable=False)
    status = Column(Boolean, default=True)
    study_program = Column(String, nullable=True)

    modules = relationship("Module", secondary=module_specializations, back_populates="specializations")


class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    # SQL Schema uses capitalized "Name" and "Size"
    name = Column("Name", String(100), nullable=False)
    size = Column("Size", Integer, nullable=False)
    description = Column("Brief description", String(250), nullable=True)
    email = Column("Email", String(200), nullable=True)
    program = Column("Program", String, nullable=True)
    parent_group = Column("Parent_Group", String, nullable=True)


class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    capacity = Column(Integer, nullable=False)
    type = Column(String, nullable=False)
    status = Column(Boolean, default=True, nullable=False)
    # SQL Schema uses capitalized "Equipment"
    equipment = Column("Equipment", String, nullable=True)
    location = Column(String(200), nullable=True)


class LecturerAvailability(Base):
    __tablename__ = "lecturer_availabilities"
    id = Column(Integer, primary_key=True, index=True)
    lecturer_id = Column(Integer, ForeignKey("lecturers.ID", ondelete="CASCADE"), unique=True, nullable=False)
    schedule_data = Column(JSON, default={}, nullable=False)


# ------------------------------------------------------------
# CONSTRAINT MODELS (COMBINED)
# ------------------------------------------------------------

class ConstraintType(Base):
    """
    From file #1: Separate constraint_types table.
    If your DB uses the newer single-table scheduler_constraints only,
    you can keep this model without using it.
    """
    __tablename__ = "constraint_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), unique=True, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    constraint_level = Column(String, nullable=True)
    constraint_format = Column(String, nullable=True)
    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)
    constraint_rule = Column(Text, nullable=True)
    constraint_target = Column(String, nullable=True)


class SchedulerConstraint(Base):
    """
    COMBINED SchedulerConstraint model:
    - Keeps the "old" fields (constraint_type_id, hardness, weight, config, notes, etc.)
    - Adds the "new" fields (name, category, rule_text, validity dates)
    - Sets target_id to String to support module codes like "CS-101"
    """
    __tablename__ = "scheduler_constraints"

    id = Column(Integer, primary_key=True, index=True)

    # ---------- NEW STYLE FIELDS (from file #2) ----------
    # Basic Info
    name = Column(String, nullable=True)  # internal title (nullable to support old DB)
    category = Column(String, default="General", nullable=True)

    # Natural Language Instruction
    rule_text = Column(Text, nullable=True)

    # Validity Dates (Optional)
    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)

    # ---------- OLD STYLE FIELDS (from file #1) ----------
    constraint_type_id = Column(Integer, ForeignKey("constraint_types.id"), nullable=True)
    hardness = Column(String(10), nullable=True)
    weight = Column(Integer, nullable=True)

    # Context / Scope (exists in both)
    scope = Column(String(20), nullable=False)

    # ✅ CHANGED: String to support Module Codes (e.g., "CS-101")
    # Old file used Integer, new file uses String
    target_id = Column(String, nullable=True, default="0")

    # Old config system
    config = Column(JSON, default={}, nullable=False)
    notes = Column(Text, nullable=True)

    # Status (exists in both)
    is_enabled = Column(Boolean, default=True, nullable=False)

    # Timestamps (exists in both)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)
