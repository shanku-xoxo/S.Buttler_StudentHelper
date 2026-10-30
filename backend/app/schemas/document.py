from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class DocumentResponse(BaseModel):
    id: int
    module_id: int
    title: str
    file_name: str
    file_path: str
    file_type: str
    file_size: int
    uploaded_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DocumentDetailResponse(DocumentResponse):
    extracted_text: Optional[str] = None

class DocumentSearchResult(BaseModel):
    document_id: int
    title: str
    module_id: int
    snippet: str
    score: float

class NoteCreate(BaseModel):
    module_id: int
    title: str
    content: str
    file_name: Optional[str] = None
    is_default_notes_file: bool = False

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class NoteResponse(BaseModel):
    id: int
    module_id: int
    title: str
    file_name: str
    file_path: str
    content: str
    is_default_notes_file: bool
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
