from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.services.document_service import DocumentService
from app.schemas.document import (
    DocumentResponse, DocumentDetailResponse, DocumentSearchResult,
    NoteCreate, NoteUpdate, NoteResponse
)

router = APIRouter(prefix="/api/documents", tags=["Documents & Notes"])

@router.post("/upload", response_model=DocumentResponse)
def upload_document(
    module_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    mod_id = None
    if module_id is not None:
        val_str = str(module_id).strip().lower()
        if val_str and val_str not in ("null", "undefined", "none", ""):
            try:
                mod_id = int(val_str)
            except ValueError:
                mod_id = None
    return DocumentService.save_uploaded_file(db, mod_id, file)

@router.get("/search", response_model=List[DocumentSearchResult])
def search_documents(
    query: str,
    module_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return DocumentService.search_documents(db, query, module_id=module_id)

@router.get("/list", response_model=List[DocumentResponse])
def get_documents_list(module_id: Optional[int] = None, db: Session = Depends(get_db)):
    return DocumentService.get_documents(db, module_id=module_id)

@router.get("/notes/list", response_model=List[NoteResponse])
def get_notes_list(module_id: Optional[int] = None, db: Session = Depends(get_db)):
    return DocumentService.get_all_notes(db, module_id=module_id)

@router.get("/notes/default/{module_id}", response_model=NoteResponse)
def get_default_notes(module_id: int, db: Session = Depends(get_db)):
    return DocumentService.get_default_or_create_notes(db, module_id)

@router.post("/notes/{note_id}/append", response_model=NoteResponse)
def append_to_note(
    note_id: int,
    content: str = Form(...),
    topic_header: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    try:
        return DocumentService.append_to_note(db, note_id, content, topic_header)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/notes", response_model=NoteResponse)
def create_note_file(data: NoteCreate, db: Session = Depends(get_db)):
    return DocumentService.create_note_file(db, data)

@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document_details(document_id: int, db: Session = Depends(get_db)):
    doc = DocumentService.get_document_by_id(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    success = DocumentService.delete_document(db, document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "deleted", "document_id": document_id}
