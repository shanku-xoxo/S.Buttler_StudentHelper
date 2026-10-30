from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.services.academic_service import AcademicService
from app.schemas.academic import (
    AcademicYearCreate, AcademicYearResponse,
    SemesterCreate, SemesterResponse,
    SubjectCreate, SubjectResponse,
    ModuleCreate, ModuleResponse
)

router = APIRouter(prefix="/api/academic", tags=["Academic Structure"])

@router.post("/years", response_model=AcademicYearResponse)
def create_academic_year(data: AcademicYearCreate, db: Session = Depends(get_db)):
    return AcademicService.create_academic_year(db, data)

@router.get("/years", response_model=List[AcademicYearResponse])
def get_academic_years(db: Session = Depends(get_db)):
    return AcademicService.get_academic_years(db)

@router.post("/semesters", response_model=SemesterResponse)
def create_semester(data: SemesterCreate, db: Session = Depends(get_db)):
    return AcademicService.create_semester(db, data)

@router.get("/semesters", response_model=List[SemesterResponse])
def get_semesters(db: Session = Depends(get_db)):
    return AcademicService.get_semesters(db)

@router.post("/subjects", response_model=SubjectResponse)
def create_subject(data: SubjectCreate, db: Session = Depends(get_db)):
    return AcademicService.create_subject(db, data)

@router.get("/subjects", response_model=List[SubjectResponse])
def get_subjects(semester_id: Optional[int] = None, db: Session = Depends(get_db)):
    return AcademicService.get_subjects(db, semester_id=semester_id)

@router.post("/modules", response_model=ModuleResponse)
def create_module(data: ModuleCreate, db: Session = Depends(get_db)):
    return AcademicService.create_module(db, data)

@router.get("/modules", response_model=List[ModuleResponse])
def get_modules(subject_id: Optional[int] = None, db: Session = Depends(get_db)):
    return AcademicService.get_modules(db, subject_id=subject_id)
