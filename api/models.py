from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, Text, JSON, TIMESTAMP, Table
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

# Association Table for Many-to-Many relationship between Modules and Specializations
module_specializations = Table(
    "module_specializations",
    Base.metadata,
    Column("module_code", String, ForeignKey("modules.module_code", ondelete="CASCADE"), primary_key=True),
    Column("specialization_id", Integer, ForeignKey("specializations.id", ondelete="CASCADE"), primary_key=True),
)
# Association Table for Many-to-Many relationship between Lecturers and Modules
lecturer_modules = Table(
    "lecturer_modules",
    Base.metadata,
    Column("lecturer_id", Integer, ForeignKey("lecturers.ID", ondelete="CASCADE"), primary_key=True),
    Column("module_code", String, ForeignKey("modules.module_code", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # admin, pm, hosp, lecturer, student
    lecturer_id = Column(Integer, ForeignKey("lecturers.ID"), nullable=True)

    lecturer_profile = relationship("Lecturer")


# ✅ DOMAINS TABLE (matches your schema)
class Domain(Base):
    __tablename__ = "domains"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, nullable=False)


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

    # ✅ NEW: FK to domains (NO email logic)
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=True)
    domain_rel = relationship("Domain")

    modules = relationship("Module", secondary=lecturer_modules, back_populates="lecturers")

    # optional convenience (used by schemas response)
    @property
    def domain(self):
        return self.domain_rel.name if self.domain_rel else None


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
    program_id = Column(Integer, ForeignKey("study_programs.id", ondelete="CASCADE"), nullable=True)

    specializations = relationship("Specialization", secondary=module_specializations, back_populates="modules")
    lecturers = relationship("Lecturer", secondary=lecturer_modules, back_populates="modules")


class Specialization(Base):
    __tablename__ = "specializations"
    id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey("study_programs.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    acronym = Column(String, nullable=False)
    start_date = Column(String, nullable=False)
    status = Column(Boolean, default=True)
    study_program = Column(String, nullable=True)

    modules = relationship("Module", secondary=module_specializations, back_populates="specializations")


class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
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
    equipment = Column("Equipment", String, nullable=True)
    location = Column(String(200), nullable=True)


class LecturerAvailability(Base):
    __tablename__ = "lecturer_availabilities"
    id = Column(Integer, primary_key=True, index=True)
    lecturer_id = Column(Integer, ForeignKey("lecturers.ID", ondelete="CASCADE"), unique=True, nullable=False)
    schedule_data = Column(JSON, default={}, nullable=False)


class SchedulerConstraint(Base):
    __tablename__ = "scheduler_constraints"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, default="General")
    rule_text = Column(Text, nullable=False)
    scope = Column(String(20), nullable=False)
    target_id = Column(String, nullable=True, default="0")
    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)
    is_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)


class Semester(Base):
    __tablename__ = "semesters"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    acronym = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)


class OfferedModule(Base):
    __tablename__ = "offered_modules"

    id = Column(Integer, primary_key=True, index=True)

    module_code = Column(String, ForeignKey("modules.module_code", ondelete="CASCADE"), nullable=False)

    lecturer_id = Column(Integer, ForeignKey("lecturers.ID"), nullable=True)

    semester = Column(String, nullable=False)

    status = Column(String, default="Confirmed")

    module = relationship("Module")
    lecturer = relationship("Lecturer")


class ScheduleEntry(Base):
    __tablename__ = "schedule_entries"

    id = Column(Integer, primary_key=True, index=True)

    offered_module_id = Column(Integer, ForeignKey("offered_modules.id", ondelete="CASCADE"), nullable=False)

    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)

    day_of_week = Column(String, nullable=False)  # "Monday", "Tuesday"...
    start_time = Column(String, nullable=False)  # "08:00"
    end_time = Column(String, nullable=False)  # "10:00"

    semester = Column(String, nullable=False)

    offered_module = relationship("OfferedModule")
    room = relationship("Room")
