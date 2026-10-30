from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database import get_db
from app.services.ai_service import AIService
from app.schemas.ai import (
    ChatMessageRequest, ChatResponse,
    ActionConfirmationRequest, NoteGenerationRequest, ModuleSummaryRequest
)

router = APIRouter(prefix="/api/ai", tags=["AI Student Assistant"])

@router.post("/chat", response_model=ChatResponse)
def chat_with_ai(data: ChatMessageRequest, db: Session = Depends(get_db)):
    return AIService.process_chat(
        db,
        message=data.message,
        conversation_id=data.conversation_id,
        subject_id=data.subject_id,
        module_id=data.module_id,
        api_key=data.api_key,
        document_id=data.document_id,
        document_ids=data.document_ids
    )

@router.post("/confirm-action")
def confirm_proposed_action(data: ActionConfirmationRequest, db: Session = Depends(get_db)):
    try:
        return AIService.confirm_action(db, data.proposed_action_id, data.confirm)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/summarize-module")
def summarize_module(data: ModuleSummaryRequest, db: Session = Depends(get_db)):
    try:
        return AIService.generate_module_summary(db, data.module_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
