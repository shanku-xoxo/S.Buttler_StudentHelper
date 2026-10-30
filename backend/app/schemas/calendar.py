from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class CalendarEventBase(BaseModel):
    title: str
    subject_id: Optional[int] = None
    description: Optional[str] = None
    event_type: str = "Academic"  # Exam, Assignment, Class, Lab, Study, Personal
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    due_date: Optional[str] = None
    location: Optional[str] = None
    reminder_minutes: int = 30

class CalendarEventCreate(CalendarEventBase):
    pass

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    subject_id: Optional[int] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    due_date: Optional[str] = None
    location: Optional[str] = None
    reminder_minutes: Optional[int] = None

class CalendarEventResponse(CalendarEventBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
