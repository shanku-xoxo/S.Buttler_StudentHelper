from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class AcademicYearBase(BaseModel):
    name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class AcademicYearCreate(AcademicYearBase):
    pass

class AcademicYearResponse(AcademicYearBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class SemesterBase(BaseModel):
    name: str
    academic_year_id: Optional[int] = None
    is_active: bool = True

class SemesterCreate(SemesterBase):
    pass

class SemesterResponse(SemesterBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class SubjectBase(BaseModel):
    name: str
    semester_id: int
    code: Optional[str] = None
    description: Optional[str] = None

class SubjectCreate(SubjectBase):
    pass

class SubjectResponse(SubjectBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ModuleBase(BaseModel):
    name: str
    subject_id: int
    code: Optional[str] = None
    description: Optional[str] = None

class ModuleCreate(ModuleBase):
    pass

class ModuleResponse(ModuleBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
