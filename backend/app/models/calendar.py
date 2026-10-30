from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(String, nullable=False, default="Academic")  # Exam, Assignment, Class, Lab, Study, Personal
    start_time = Column(String, nullable=True)  # ISO format string or YYYY-MM-DD HH:MM
    end_time = Column(String, nullable=True)
    due_date = Column(String, nullable=True)   # YYYY-MM-DD
    location = Column(String, nullable=True)
    reminder_minutes = Column(Integer, default=30)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    subject = relationship("Subject", back_populates="calendar_events")
    tasks = relationship("Task", back_populates="calendar_event")
