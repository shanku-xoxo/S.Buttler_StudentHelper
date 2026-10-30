from sqlalchemy.orm import Session
from app.models.academic import AcademicYear, Semester, Subject, Module
from app.schemas.academic import AcademicYearCreate, SemesterCreate, SubjectCreate, ModuleCreate
from typing import List, Optional

class AcademicService:
    @staticmethod
    def create_academic_year(db: Session, data: AcademicYearCreate) -> AcademicYear:
        year = AcademicYear(**data.model_dump())
        db.add(year)
        db.commit()
        db.refresh(year)
        return year

    @staticmethod
    def get_academic_years(db: Session) -> List[AcademicYear]:
        return db.query(AcademicYear).all()

    @staticmethod
    def create_semester(db: Session, data: SemesterCreate) -> Semester:
        semester = Semester(**data.model_dump())
        db.add(semester)
        db.commit()
        db.refresh(semester)
        return semester

    @staticmethod
    def get_semesters(db: Session) -> List[Semester]:
        return db.query(Semester).all()

    @staticmethod
    def create_subject(db: Session, data: SubjectCreate) -> Subject:
        subject = Subject(**data.model_dump())
        db.add(subject)
        db.commit()
        db.refresh(subject)
        return subject

    @staticmethod
    def get_subjects(db: Session, semester_id: Optional[int] = None) -> List[Subject]:
        query = db.query(Subject)
        if semester_id:
            query = query.filter(Subject.semester_id == semester_id)
        return query.all()

    @staticmethod
    def create_module(db: Session, data: ModuleCreate) -> Module:
        module = Module(**data.model_dump())
        db.add(module)
        db.commit()
        db.refresh(module)
        return module

    @staticmethod
    def get_modules(db: Session, subject_id: Optional[int] = None) -> List[Module]:
        query = db.query(Module)
        if subject_id:
            query = query.filter(Module.subject_id == subject_id)
        return query.all()
