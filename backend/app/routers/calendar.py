from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.services.calendar_service import CalendarService
from app.schemas.calendar import (
    CalendarEventCreate, CalendarEventUpdate, CalendarEventResponse
)

router = APIRouter(prefix="/api/calendar", tags=["Calendar & Deadlines"])

@router.post("/events", response_model=CalendarEventResponse)
def create_calendar_event(data: CalendarEventCreate, db: Session = Depends(get_db)):
    return CalendarService.create_event(db, data)

@router.get("/events", response_model=List[CalendarEventResponse])
def get_calendar_events(
    subject_id: Optional[int] = None,
    date_str: Optional[str] = None,
    month_str: Optional[str] = None,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return CalendarService.get_events(
        db, subject_id=subject_id, date_str=date_str, month_str=month_str, event_type=event_type
    )

@router.get("/events/{event_id}", response_model=CalendarEventResponse)
def get_calendar_event(event_id: int, db: Session = Depends(get_db)):
    event = CalendarService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail=f"Calendar event {event_id} not found")
    return event

@router.put("/events/{event_id}", response_model=CalendarEventResponse)
def update_calendar_event(event_id: int, data: CalendarEventUpdate, db: Session = Depends(get_db)):
    event = CalendarService.update_event(db, event_id, data)
    if not event:
        raise HTTPException(status_code=404, detail=f"Calendar event {event_id} not found")
    return event

@router.delete("/events/{event_id}")
def delete_calendar_event(event_id: int, db: Session = Depends(get_db)):
    success = CalendarService.delete_event(db, event_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Calendar event {event_id} not found")
    return {"message": "Event deleted successfully"}
