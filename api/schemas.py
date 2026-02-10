from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import date

# ------------------------------------------------------------
# AUTH
# ------------------------------------------------------------

class LoginRequest(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    lecturer_id: Optional[int] = None


# ------------------------------------------------------------
# DOMAINS
# ------------------------------------------------------------

class DomainBase(BaseModel):
    name: str


class DomainCreate(DomainBase):
    pass


class DomainResponse(DomainBase):
    id: int

    class Config:
        from_attributes = True


# ------------------------------------------------------------
# LECTURERS
# ------------------------------------------------------------

class LecturerBase(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    title: str
    employment_type: str
    personal_email: Optional[str] = None
    mdh_email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    teaching_load: Optional[str] = None


# Optional module mini (from file 1). Keep it to not break older responses.
class ModuleMini(BaseModel):
    module_code: str
    name: str

    class Config:
        from_attributes = True


class LecturerCreate(LecturerBase):
    # From file 2: domain label selected/created on frontend.
    # Stored in domains table ONLY (not necessarily in lecturers table).
    domain_name: Optional[str] = None


class LecturerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    title: Optional[str] = None
    employment_type: Optional[str] = None
    personal_email: Optional[str] = None
    mdh_email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    teaching_load: Optional[str] = None

    # From file 2
    domain_name: Optional[str] = None


class LecturerSelfUpdate(BaseModel):
    personal_email: Optional[str] = None
    phone: Optional[str] = None


class LecturerResponse(LecturerBase):
    id: int

    # From file 2: computed from mdh_email in models.Lecturer.domain property
    domain: Optional[str] = None

    # From file 1: keep modules if backend still returns them (harmless).
    modules: List[ModuleMini] = []

    class Config:
        from_attributes = True


# From file 1: keep in case API still uses it
class LecturerModulesUpdate(BaseModel):
    module_codes: List[str] = []


# ------------------------------------------------------------
# STUDY PROGRAMS
# ------------------------------------------------------------

class StudyProgramBase(BaseModel):
    name: str
    acronym: str
    status: bool = True
    start_date: str
    total_ects: int
    location: Optional[str] = None
    level: str = "Bachelor"
    degree_type: Optional[str] = None
    head_of_program_id: Optional[int] = None


class StudyProgramCreate(StudyProgramBase):
    pass


class StudyProgramUpdate(BaseModel):
    name: Optional[str] = None
    acronym: Optional[str] = None
    status: Optional[bool] = None
    start_date: Optional[str] = None
    total_ects: Optional[int] = None
    location: Optional[str] = None
    level: Optional[str] = None
    degree_type: Optional[str] = None
    head_of_program_id: Optional[int] = None


class StudyProgramResponse(StudyProgramBase):
    id: int
    head_lecturer: Optional[LecturerResponse] = None

    class Config:
        from_attributes = True


# ------------------------------------------------------------
# SPECIALIZATIONS
# ------------------------------------------------------------

class SpecializationBase(BaseModel):
    name: str
    acronym: str
    start_date: str
    program_id: Optional[int] = None
    status: bool = True
    study_program: Optional[str] = None


class SpecializationCreate(SpecializationBase):
    pass


class SpecializationUpdate(BaseModel):
    name: Optional[str] = None
    acronym: Optional[str] = None
    start_date: Optional[str] = None
    program_id: Optional[int] = None
    status: Optional[bool] = None
    study_program: Optional[str] = None


class SpecializationResponse(SpecializationBase):
    id: int

    class Config:
        from_attributes = True


# ------------------------------------------------------------
# MODULES
# ------------------------------------------------------------

class AssessmentPart(BaseModel):
    type: str
    weight: Optional[int] = Field(default=None, ge=0, le=100)


class ModuleBase(BaseModel):
    module_code: str
    name: str
    ects: int
    room_type: str
    assessment_type: Optional[str] = None
    semester: int
    category: Optional[str] = None
    program_id: Optional[int] = None


class ModuleCreate(ModuleBase):
    specialization_ids: Optional[List[int]] = []
    assessment_breakdown: Optional[List[AssessmentPart]] = None


class ModuleUpdate(BaseModel):
    name: Optional[str] = None
    ects: Optional[int] = None
    room_type: Optional[str] = None
    assessment_type: Optional[str] = None
    assessment_breakdown: Optional[List[AssessmentPart]] = None
    semester: Optional[int] = None
    category: Optional[str] = None
    program_id: Optional[int] = None
    specialization_ids: Optional[List[int]] = None


class ModuleResponse(ModuleBase):
    assessment_breakdown: List[AssessmentPart] = []
    specializations: List[SpecializationResponse] = []

    class Config:
        from_attributes = True


# ------------------------------------------------------------
# GROUPS
# ------------------------------------------------------------

class GroupBase(BaseModel):
    name: str
    size: int
    description: Optional[str] = None
    email: Optional[str] = None
    program: Optional[str] = None
    parent_group: Optional[str] = None


class GroupCreate(GroupBase):
    pass


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    size: Optional[int] = None
    description: Optional[str] = None
    email: Optional[str] = None
    program: Optional[str] = None
    parent_group: Optional[str] = None


class GroupResponse(GroupBase):
    id: int

    class Config:
        from_attributes = True


# ------------------------------------------------------------
# ROOMS
# ------------------------------------------------------------

class RoomBase(BaseModel):
    name: str
    capacity: int
    type: str
    status: bool = True
    equipment: Optional[str] = None
    location: Optional[str] = None


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None
    type: Optional[str] = None
    status: Optional[bool] = None
    equipment: Optional[str] = None
    location: Optional[str] = None


class RoomResponse(RoomBase):
    id: int

    class Config:
        from_attributes = True


# ------------------------------------------------------------
# AVAILABILITY
# ------------------------------------------------------------

class AvailabilityUpdate(BaseModel):
    lecturer_id: int
    schedule_data: Any


class AvailabilityResponse(BaseModel):
    id: int
    lecturer_id: int
    schedule_data: Any

    class Config:
        from_attributes = True


# ------------------------------------------------------------
# CONSTRAINT TYPES (from file 2)
# ------------------------------------------------------------

class ConstraintTypeResponse(BaseModel):
    id: int
    name: str
    active: bool = True
    constraint_level: Optional[str] = None
    constraint_format: Optional[str] = None
    valid_from: Optional[Any] = None
    valid_to: Optional[Any] = None
    constraint_rule: Optional[str] = None
    constraint_target: Optional[str] = None

    class Config:
        from_attributes = True


# ------------------------------------------------------------
# SCHEDULER CONSTRAINTS (COMBINED)
# ------------------------------------------------------------

class SchedulerConstraintBase(BaseModel):
    # ---- New style (from file 1) ----
    name: Optional[str] = None
    category: Optional[str] = None
    rule_text: Optional[str] = None

    # ---- Old style (from file 2) ----
    constraint_type_id: Optional[int] = None
    hardness: Optional[str] = None
    weight: Optional[int] = 10
    config: Any = {}
    notes: Optional[str] = None

    # ---- Common ----
    scope: str

    # ✅ Prefer string IDs (supports module codes). Still okay for numeric strings.
    target_id: Optional[str] = None

    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    is_enabled: bool = True


class SchedulerConstraintCreate(SchedulerConstraintBase):
    pass


class SchedulerConstraintUpdate(BaseModel):
    # New style
    name: Optional[str] = None
    category: Optional[str] = None
    rule_text: Optional[str] = None

    # Old style
    constraint_type_id: Optional[int] = None
    hardness: Optional[str] = None
    weight: Optional[int] = None
    config: Optional[Any] = None
    notes: Optional[str] = None

    # Common
    scope: Optional[str] = None
    target_id: Optional[str] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    is_enabled: Optional[bool] = None


class SchedulerConstraintResponse(SchedulerConstraintBase):
    id: int

    class Config:
        from_attributes = True
