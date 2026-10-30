from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class AcademicYear(Base):
    __tablename__ = "academic_years"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # e.g., "2025-2026"
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)

    semesters = relationship("Semester", back_populates="academic_year", cascade="all, delete-orphan")

class Semester(Base):
    __tablename__ = "semesters"

    id = Column(Integer, primary_key=True, index=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=True)
    name = Column(String, nullable=False)  # e.g., "Fall 2025", "Semester 4"
    is_active = Column(Boolean, default=True)

    academic_year = relationship("AcademicYear", back_populates="semesters")
    subjects = relationship("Subject", back_populates="semester", cascade="all, delete-orphan")

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)
    name = Column(String, nullable=False)  # e.g., "Database Management Systems"
    code = Column(String, nullable=True)   # e.g., "CS301"
    description = Column(String, nullable=True)

    semester = relationship("Semester", back_populates="subjects")
    modules = relationship("Module", back_populates="subject", cascade="all, delete-orphan")
    calendar_events = relationship("CalendarEvent", back_populates="subject", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="subject", cascade="all, delete-orphan")

class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    name = Column(String, nullable=False)  # e.g., "Module 1", "LAB", "Relational DBMS"
    code = Column(String, nullable=True)
    description = Column(String, nullable=True)

    subject = relationship("Subject", back_populates="modules")
    documents = relationship("Document", back_populates="module", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="module", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="module", cascade="all, delete-orphan")
