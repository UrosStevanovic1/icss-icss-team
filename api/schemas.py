from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import date, datetime

# --- AUTH ---
class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    lecturer_id: Optional[int] = None

# --- DOMAINS ---
class DomainBase(BaseModel):
    name: str

class DomainCreate(DomainBase):
    pass

class DomainResponse(DomainBase):
    id: int
    class Config:
        from_attributes = True

# --- LECTURERS ---
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

class ModuleMini(BaseModel):
    module_code: str
    name: str
    class Config:
        from_attributes = True

# ✅ accept domain_id on create
class LecturerCreate(LecturerBase):
    domain_id: Optional[int] = None

# ✅ accept domain_id on update
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
    domain_id: Optional[int] = None

class LecturerSelfUpdate(BaseModel):
    personal_email: Optional[str] = None
    phone: Optional[str] = None

class LecturerResponse(LecturerBase):
    id: int
    # ✅ return domain_id + domain label (NOT based on email)
    domain_id: Optional[int] = None
    domain: Optional[str] = None
    modules: List[ModuleMini] = []
    class Config:
        from_attributes = True

class LecturerModulesUpdate(BaseModel):
    module_codes: List[str] = []

# --- STUDY PROGRAMS ---
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

# --- SPECIALIZATIONS ---
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

# --- MODULES ---
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

# --- GROUPS ---
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

# --- ROOMS ---
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

# --- AVAILABILITY ---
class AvailabilityUpdate(BaseModel):
    lecturer_id: int
    schedule_data: Any

class AvailabilityResponse(BaseModel):
    id: int
    lecturer_id: int
    schedule_data: Any
    class Config:
        from_attributes = True

# --- SCHEDULER CONSTRAINTS ---
class SchedulerConstraintBase(BaseModel):
    name: str
    category: str
    rule_text: str
    scope: str
    target_id: Optional[str] = "0"
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    is_enabled: bool = True

class SchedulerConstraintCreate(SchedulerConstraintBase):
    pass

class SchedulerConstraintUpdate(SchedulerConstraintBase):
    name: Optional[str] = None
    category: Optional[str] = None
    rule_text: Optional[str] = None
    scope: Optional[str] = None
    target_id: Optional[str] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    is_enabled: Optional[bool] = None

class SchedulerConstraintResponse(SchedulerConstraintBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class SemesterBase(BaseModel):
    name: str
    acronym: str
    start_date: date
    end_date: date

class SemesterCreate(SemesterBase):
    pass

class SemesterUpdate(BaseModel):
    name: Optional[str] = None
    acronym: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class SemesterResponse(SemesterBase):
    id: int
    class Config:
        from_attributes = True
