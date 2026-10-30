from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from app.models.task import Task, ProgressRecord
from app.config import DEFAULT_TASK_ESTIMATES
from app.schemas.task import TaskCreate, TaskUpdate, WorkloadSummary, DynamicRedistributionRequest

class PlannerService:
    @staticmethod
    def estimate_task_hours(title: str, task_type: str = "Default") -> float:
        title_lower = title.lower()
        if "exam" in title_lower:
            return DEFAULT_TASK_ESTIMATES["Exam Preparation"]
        elif "assignment" in title_lower or "lab" in title_lower:
            return DEFAULT_TASK_ESTIMATES["Assignment"]
        elif "module" in title_lower or "chapter" in title_lower:
            return DEFAULT_TASK_ESTIMATES["Module Study"]
        elif "revision" in title_lower or "review" in title_lower:
            return DEFAULT_TASK_ESTIMATES["Revision"]
        return DEFAULT_TASK_ESTIMATES.get(task_type, 2.5)

    @staticmethod
    def create_task(db: Session, data: TaskCreate) -> Task:
        task_data = data.model_dump()
        if task_data.get("estimated_hours") is None or task_data.get("estimated_hours") == 2.0:
            task_data["estimated_hours"] = PlannerService.estimate_task_hours(task_data["title"])
        
        task = Task(**task_data)
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def get_tasks(
        db: Session,
        subject_id: Optional[int] = None,
        module_id: Optional[int] = None,
        horizon: Optional[str] = None,  # daily, monthly, semester
        status: Optional[str] = None
    ) -> List[Task]:
        query = db.query(Task)
        if subject_id:
            query = query.filter(Task.subject_id == subject_id)
        if module_id:
            query = query.filter(Task.module_id == module_id)
        if status:
            query = query.filter(Task.status == status)

        today_str = datetime.now().strftime("%Y-%m-%d")
        if horizon == "daily":
            query = query.filter((Task.scheduled_date == today_str) | (Task.due_date == today_str))
        elif horizon == "monthly":
            month_str = datetime.now().strftime("%Y-%m")
            query = query.filter((Task.scheduled_date.like(f"{month_str}%")) | (Task.due_date.like(f"{month_str}%")))
        # semester horizon returns all active tasks by default

        return query.all()

    @staticmethod
    def update_task(db: Session, task_id: int, data: TaskUpdate) -> Optional[Task]:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return None
        
        update_dict = data.model_dump(exclude_unset=True)
        
        # If completing task, record completion date
        if update_dict.get("status") == "Completed" and task.status != "Completed":
            task.completion_date = datetime.now().strftime("%Y-%m-%d")

        for key, value in update_dict.items():
            setattr(task, key, value)

        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def get_workload_summary(db: Session, subject_id: Optional[int] = None) -> WorkloadSummary:
        query = db.query(Task)
        if subject_id:
            query = query.filter(Task.subject_id == subject_id)
        
        tasks = query.all()
        total_tasks = len(tasks)
        completed_tasks = [t for t in tasks if t.status == "Completed"]
        pending_tasks = [t for t in tasks if t.status != "Completed"]

        total_estimated = sum(t.estimated_hours for t in tasks)
        remaining_estimated = sum(max(0.0, t.estimated_hours - (t.actual_hours or 0.0)) for t in pending_tasks)
        total_actual = sum(t.actual_hours or 0.0 for t in tasks)

        available_days = 5  # default window
        recommended_daily = round(remaining_estimated / available_days, 2) if available_days > 0 else 0.0

        return WorkloadSummary(
            total_tasks=total_tasks,
            completed_tasks=len(completed_tasks),
            pending_tasks=len(pending_tasks),
            total_estimated_hours=round(total_estimated, 2),
            remaining_estimated_hours=round(remaining_estimated, 2),
            total_actual_hours=round(total_actual, 2),
            recommended_daily_hours=recommended_daily
        )

    @staticmethod
    def redistribute_remaining_workload(
        db: Session,
        request: DynamicRedistributionRequest,
        subject_id: Optional[int] = None
    ) -> Dict[str, Any]:
        query = db.query(Task).filter(Task.status != "Completed")
        if subject_id:
            query = query.filter(Task.subject_id == subject_id)

        pending_tasks = query.order_by(Task.due_date.asc().nullslast(), Task.priority.desc()).all()
        
        available_days = max(1, request.available_days)
        max_daily = request.max_daily_hours

        today = datetime.now()
        schedule_map = {}
        day_loads = [0.0] * available_days

        for task in pending_tasks:
            rem_hours = max(0.5, task.estimated_hours - (task.actual_hours or 0.0))
            
            # Find day with smallest load that doesn't exceed max_daily if possible
            best_day_idx = 0
            min_load = day_loads[0]
            for idx in range(available_days):
                if day_loads[idx] < min_load:
                    min_load = day_loads[idx]
                    best_day_idx = idx

            target_date = (today + timedelta(days=best_day_idx)).strftime("%Y-%m-%d")
            day_loads[best_day_idx] += rem_hours
            
            task.scheduled_date = target_date
            if target_date not in schedule_map:
                schedule_map[target_date] = []
            schedule_map[target_date].append({
                "task_id": task.id,
                "title": task.title,
                "estimated_hours": rem_hours
            })

        db.commit()

        return {
            "rescheduled_tasks_count": len(pending_tasks),
            "available_days": available_days,
            "daily_workload_hours": [round(load, 2) for load in day_loads],
            "schedule": schedule_map
        }
