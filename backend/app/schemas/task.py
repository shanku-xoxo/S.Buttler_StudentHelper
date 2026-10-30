from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class TaskBase(BaseModel):
    title: str
    subject_id: Optional[int] = None
    module_id: Optional[int] = None
    parent_task_id: Optional[int] = None
    calendar_event_id: Optional[int] = None
    description: Optional[str] = None
    status: str = "Pending"  # Pending, In Progress, Completed
    priority: str = "Medium"  # Low, Medium, High
    estimated_hours: float = 2.0
    actual_hours: float = 0.0
    due_date: Optional[str] = None
    scheduled_date: Optional[str] = None
    completion_date: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    subject_id: Optional[int] = None
    module_id: Optional[int] = None
    parent_task_id: Optional[int] = None
    calendar_event_id: Optional[int] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    due_date: Optional[str] = None
    scheduled_date: Optional[str] = None
    completion_date: Optional[str] = None

class TaskResponse(TaskBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class WorkloadSummary(BaseModel):
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    total_estimated_hours: float
    remaining_estimated_hours: float
    total_actual_hours: float
    recommended_daily_hours: float

class DynamicRedistributionRequest(BaseModel):
    available_days: int = 5
    max_daily_hours: float = 4.0

class ProgressRecordCreate(BaseModel):
    task_id: Optional[int] = None
    module_id: Optional[int] = None
    topic_name: str
    status: str = "Completed"
    notes: Optional[str] = None

class ProgressRecordResponse(BaseModel):
    id: int
    task_id: Optional[int] = None
    module_id: Optional[int] = None
    topic_name: str
    status: str
    notes: Optional[str] = None
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
