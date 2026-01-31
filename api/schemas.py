from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any

# --- AUTH ---
class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    lecturer_id: Optional[int] = None  # ✅ ADD THIS

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

class LecturerCreate(LecturerBase):
    pass

class LecturerResponse(LecturerBase):
    id: int
    class Config:
        from_attributes = True

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

class StudyProgramResponse(StudyProgramBase):
    id: int
    # ✅ CRITICAL: This allows the API to send Title, Name, and Last Name to the frontend
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

class SpecializationResponse(SpecializationBase):
    id: int
    class Config:
        from_attributes = True

# --- MODULES ---
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

class ModuleResponse(ModuleBase):
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

# --- CONSTRAINTS ---
class ConstraintTypeResponse(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

class SchedulerConstraintBase(BaseModel):
    constraint_type_id: int
    hardness: str
    weight: Optional[int] = 10
    scope: str
    target_id: Optional[int] = None
    config: Any = {}
    is_enabled: bool = True
    notes: Optional[str] = None

class SchedulerConstraintResponse(SchedulerConstraintBase):
    id: int
    class Config:
        from_attributes = True
