from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.calendar import CalendarEvent
from app.schemas.calendar import CalendarEventCreate, CalendarEventUpdate

class CalendarService:
    @staticmethod
    def create_event(db: Session, data: CalendarEventCreate) -> CalendarEvent:
        event = CalendarEvent(**data.model_dump())
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def get_events(
        db: Session,
        subject_id: Optional[int] = None,
        date_str: Optional[str] = None,
        month_str: Optional[str] = None,
        event_type: Optional[str] = None
    ) -> List[CalendarEvent]:
        query = db.query(CalendarEvent)
        if subject_id:
            query = query.filter(CalendarEvent.subject_id == subject_id)
        if event_type:
            query = query.filter(CalendarEvent.event_type == event_type)
        if date_str:
            query = query.filter(
                (CalendarEvent.due_date == date_str) | (CalendarEvent.start_time.like(f"{date_str}%"))
            )
        elif month_str:
            query = query.filter(
                (CalendarEvent.due_date.like(f"{month_str}%")) | (CalendarEvent.start_time.like(f"{month_str}%"))
            )
        return query.all()

    @staticmethod
    def get_event_by_id(db: Session, event_id: int) -> Optional[CalendarEvent]:
        return db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()

    @staticmethod
    def update_event(db: Session, event_id: int, data: CalendarEventUpdate) -> Optional[CalendarEvent]:
        event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
        if not event:
            return None
        
        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(event, key, value)

        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def delete_event(db: Session, event_id: int) -> bool:
        event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
        if not event:
            return False
        db.delete(event)
        db.commit()
        return True
