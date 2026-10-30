from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class ChatMessageRequest(BaseModel):
    conversation_id: Optional[int] = None
    message: str
    subject_id: Optional[int] = None
    module_id: Optional[int] = None
    api_key: Optional[str] = None
    document_id: Optional[int] = None
    document_ids: Optional[List[int]] = None

class ProposedActionResponse(BaseModel):
    id: int
    conversation_id: int
    action_type: str  # ADD_CALENDAR_EVENT, UPDATE_PROGRESS, SAVE_NOTE
    status: str       # PENDING, CONFIRMED, REJECTED
    payload_json: Dict[str, Any]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ChatResponse(BaseModel):
    conversation_id: int
    message: str
    retrieved_context_sources: List[str] = []
    proposed_actions: List[ProposedActionResponse] = []
    document_id: Optional[int] = None
    document_title: Optional[str] = None
    document_type: Optional[str] = None

class ActionConfirmationRequest(BaseModel):
    proposed_action_id: int
    confirm: bool  # True to execute, False to reject

class NoteGenerationRequest(BaseModel):
    module_id: int
    topic: str
    create_separate_file: bool = False
    custom_file_name: Optional[str] = None

class ModuleSummaryRequest(BaseModel):
    module_id: int
