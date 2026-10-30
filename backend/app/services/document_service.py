import os
import re
import shutil
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import UploadFile

from app.config import UPLOADS_DIR, NOTES_DIR
from app.models.document import Document, Note
from app.schemas.document import DocumentSearchResult, NoteCreate, NoteUpdate

class DocumentService:
    @staticmethod
    def extract_text_from_file(file_path: Path, file_type: str) -> str:
        extracted = ""
        file_type = file_type.lower().strip(".")
        try:
            if file_type in ["txt", "md", "markdown", "json", "csv", "log", "py", "java", "c", "cpp"]:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    extracted = f.read()

            elif file_type == "pdf":
                from pypdf import PdfReader
                reader = PdfReader(str(file_path))
                extracted_pages = []
                for idx, page in enumerate(reader.pages, 1):
                    text = page.extract_text()
                    if text and text.strip():
                        extracted_pages.append(f"[Page {idx}]\n" + text.strip())
                extracted = "\n\n".join(extracted_pages)

            elif file_type == "docx":
                import docx
                doc = docx.Document(str(file_path))
                extracted = "\n".join([p.text for p in doc.paragraphs if p.text])

            elif file_type in ["ppt", "pptx"]:
                try:
                    from pptx import Presentation
                    prs = Presentation(str(file_path))
                    text_runs = []
                    for idx, slide in enumerate(prs.slides, 1):
                        slide_texts = []
                        for shape in slide.shapes:
                            if hasattr(shape, "text") and shape.text and shape.text.strip():
                                slide_texts.append(shape.text.strip())
                            elif hasattr(shape, "has_table") and shape.has_table:
                                for row in shape.table.rows:
                                    row_text = " | ".join([c.text.strip() for c in row.cells if c.text.strip()])
                                    if row_text:
                                        slide_texts.append(row_text)
                        if slide_texts:
                            text_runs.append(f"[Slide {idx}]\n" + "\n".join(slide_texts))
                    extracted = "\n\n".join(text_runs)
                except Exception as ppt_err:
                    extracted = f"[Note on presentation {file_path.name}: {str(ppt_err)}]"
            else:
                extracted = file_path.name
        except Exception as e:
            extracted = f"[Error extracting text from {file_path.name}: {str(e)}]"
        return extracted

    @staticmethod
    def save_uploaded_file(db: Session, module_id: Optional[int], file: UploadFile) -> Document:
        file_ext = Path(file.filename).suffix.lower()
        clean_ext = file_ext.lstrip(".") or "txt"
        
        # If module_id not provided, assign to first available module or create a default one
        if not module_id:
            from app.models.academic import Module, Subject, Semester, AcademicYear
            first_mod = db.query(Module).first()
            if first_mod:
                module_id = first_mod.id
            else:
                year = db.query(AcademicYear).first()
                if not year:
                    year = AcademicYear(year_name="Year 1")
                    db.add(year); db.commit(); db.refresh(year)
                sem = db.query(Semester).first()
                if not sem:
                    sem = Semester(academic_year_id=year.id, semester_name="Semester 1")
                    db.add(sem); db.commit(); db.refresh(sem)
                sub = db.query(Subject).first()
                if not sub:
                    sub = Subject(semester_id=sem.id, name="General Studies", code="GEN101")
                    db.add(sub); db.commit(); db.refresh(sub)
                mod = Module(subject_id=sub.id, name="General Study Materials")
                db.add(mod); db.commit(); db.refresh(mod)
                module_id = mod.id

        safe_basename = Path(file.filename).name.replace(" ", "_")
        unique_filename = f"mod_{module_id}_{int(datetime.now().timestamp())}_{safe_basename}"
        target_path = UPLOADS_DIR / unique_filename

        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = target_path.stat().st_size
        extracted_text = DocumentService.extract_text_from_file(target_path, clean_ext)

        doc = Document(
            module_id=module_id,
            title=file.filename,
            file_name=unique_filename,
            file_path=str(target_path),
            file_type=clean_ext,
            file_size=file_size,
            extracted_text=extracted_text
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    @staticmethod
    def search_documents(db: Session, query: str, module_id: Optional[int] = None) -> List[DocumentSearchResult]:
        q_lower = query.lower().strip()
        if not q_lower:
            return []
            
        query_builder = db.query(Document)
        if module_id:
            query_builder = query_builder.filter(Document.module_id == module_id)
        
        docs = query_builder.all()
        results = []
        keywords = [k for k in re.split(r'\W+', q_lower) if len(k) > 2]

        for doc in docs:
            text = doc.extracted_text or ""
            text_lower = text.lower()
            
            # 1. Exact phrase match check
            if q_lower in text_lower or q_lower in doc.title.lower():
                occurrences = text_lower.count(q_lower) + (5 if q_lower in doc.title.lower() else 0)
                score = float(occurrences + 5)
                idx = text_lower.find(q_lower)
                start = max(0, idx - 50)
                end = min(len(text), idx + 150)
                snippet = text[start:end].strip()
                results.append(DocumentSearchResult(
                    document_id=doc.id, title=doc.title, module_id=doc.module_id, snippet=snippet, score=score
                ))
            else:
                # 2. Individual keywords fallback check
                matched_kw = [kw for kw in keywords if kw in text_lower or kw in doc.title.lower()]
                if matched_kw:
                    score = float(len(matched_kw))
                    # Find snippet around first matching keyword
                    idx = text_lower.find(matched_kw[0])
                    start = max(0, idx - 50)
                    end = min(len(text), idx + 150)
                    snippet = text[start:end].strip()
                    results.append(DocumentSearchResult(
                        document_id=doc.id, title=doc.title, module_id=doc.module_id, snippet=snippet, score=score
                    ))

        results.sort(key=lambda r: r.score, reverse=True)
        return results

    @staticmethod
    def get_default_or_create_notes(db: Session, module_id: int) -> Note:
        note = db.query(Note).filter(Note.module_id == module_id, Note.is_default_notes_file == True).first()
        if not note:
            file_name = f"mod_{module_id}_notes.txt"
            file_path = NOTES_DIR / file_name
            if not file_path.exists():
                file_path.write_text("=== MODULE NOTES ===\n\n", encoding="utf-8")
            
            note = Note(
                module_id=module_id,
                title="notes.txt",
                file_name=file_name,
                file_path=str(file_path),
                content="=== MODULE NOTES ===\n\n",
                is_default_notes_file=True
            )
            db.add(note)
            db.commit()
            db.refresh(note)
        return note

    @staticmethod
    def append_to_note(db: Session, note_id: int, new_content: str, topic_header: Optional[str] = None) -> Note:
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            raise ValueError(f"Note {note_id} not found")
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        header = f"\n\n--- Topic: {topic_header} ({timestamp}) ---\n" if topic_header else f"\n\n--- Note ({timestamp}) ---\n"
        appended_text = header + new_content + "\n"

        note.content += appended_text
        note.updated_at = datetime.now(timezone.utc)
        
        # Write to physical file
        path = Path(note.file_path)
        with open(path, "a", encoding="utf-8") as f:
            f.write(appended_text)

        db.commit()
        db.refresh(note)
        return note

    @staticmethod
    def create_note_file(db: Session, data: NoteCreate) -> Note:
        file_name = data.file_name or f"mod_{data.module_id}_{int(datetime.now().timestamp())}_{data.title.replace(' ', '_')}.txt"
        file_path = NOTES_DIR / file_name
        file_path.write_text(data.content, encoding="utf-8")

        note = Note(
            module_id=data.module_id,
            title=data.title,
            file_name=file_name,
            file_path=str(file_path),
            content=data.content,
            is_default_notes_file=data.is_default_notes_file
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        return note

    @staticmethod
    def get_documents(db: Session, module_id: Optional[int] = None) -> List[Document]:
        query = db.query(Document)
        if module_id:
            query = query.filter(Document.module_id == module_id)
        return query.order_by(Document.uploaded_at.desc()).all()

    @staticmethod
    def get_document_by_id(db: Session, document_id: int) -> Optional[Document]:
        return db.query(Document).filter(Document.id == document_id).first()

    @staticmethod
    def delete_document(db: Session, document_id: int) -> bool:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return False
        try:
            path = Path(doc.file_path)
            if path.exists():
                path.unlink()
        except Exception:
            pass
        db.delete(doc)
        db.commit()
        return True

    @staticmethod
    def get_all_notes(db: Session, module_id: Optional[int] = None) -> List[Note]:
        query = db.query(Note)
        if module_id:
            query = query.filter(Note.module_id == module_id)
        return query.order_by(Note.updated_at.desc()).all()
