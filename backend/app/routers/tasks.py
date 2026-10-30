from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from app.database import get_db
from app.services.planner_service import PlannerService
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse,
    WorkloadSummary, DynamicRedistributionRequest
)

router = APIRouter(prefix="/api/tasks", tags=["Todo List & Dynamic Planner"])

@router.post("", response_model=TaskResponse)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    return PlannerService.create_task(db, data)

@router.get("", response_model=List[TaskResponse])
def get_tasks(
    subject_id: Optional[int] = None,
    module_id: Optional[int] = None,
    horizon: Optional[str] = None,  # daily, monthly, semester
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return PlannerService.get_tasks(
        db, subject_id=subject_id, module_id=module_id, horizon=horizon, status=status
    )

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, data: TaskUpdate, db: Session = Depends(get_db)):
    task = PlannerService.update_task(db, task_id, data)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return task

@router.get("/workload/summary", response_model=WorkloadSummary)
def get_workload_summary(subject_id: Optional[int] = None, db: Session = Depends(get_db)):
    return PlannerService.get_workload_summary(db, subject_id=subject_id)

@router.post("/redistribute")
def redistribute_workload(
    request: DynamicRedistributionRequest,
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return PlannerService.redistribute_remaining_workload(db, request, subject_id=subject_id)
