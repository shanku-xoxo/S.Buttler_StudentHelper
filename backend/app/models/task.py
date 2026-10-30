from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    parent_task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    calendar_event_id = Column(Integer, ForeignKey("calendar_events.id"), nullable=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="Pending")  # Pending, In Progress, Completed
    priority = Column(String, default="Medium")  # Low, Medium, High

    estimated_hours = Column(Float, default=2.0)
    actual_hours = Column(Float, default=0.0)

    due_date = Column(String, nullable=True)        # YYYY-MM-DD
    scheduled_date = Column(String, nullable=True)  # YYYY-MM-DD
    completion_date = Column(String, nullable=True) # YYYY-MM-DD

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    subject = relationship("Subject", back_populates="tasks")
    module = relationship("Module", back_populates="tasks")
    calendar_event = relationship("CalendarEvent", back_populates="tasks")
    parent_task = relationship("Task", remote_side=[id], backref="subtasks")

class ProgressRecord(Base):
    __tablename__ = "progress_records"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    topic_name = Column(String, nullable=False)
    status = Column(String, default="Completed")
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
