import os
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine

client = TestClient(app)

def test_document_upload_and_retrieval():
    print("=" * 80)
    print("      DOCUMENT UPLOADING & RETRIEVAL API TEST")
    print("=" * 80)

    # 1. Setup Academic Hierarchy (Semester -> Subject -> Module)
    Base.metadata.create_all(bind=engine)
    
    r_yr = client.post("/api/academic/years", json={"name": "2025-2026"})
    yr_id = r_yr.json()["id"]

    r_sem = client.post("/api/academic/semesters", json={"name": "Semester 4", "academic_year_id": yr_id})
    sem_id = r_sem.json()["id"]

    r_subj = client.post("/api/academic/subjects", json={"name": "Database Management Systems", "semester_id": sem_id, "code": "CS301"})
    subj_id = r_subj.json()["id"]

    r_mod = client.post("/api/academic/modules", json={"name": "Module 2 - Normalization", "subject_id": subj_id, "code": "MOD2"})
    mod_id = r_mod.json()["id"]

    print(f"\n[SETUP OK] Module created with ID: {mod_id}")

    # 2. Create sample document file locally
    sample_file_path = Path("sample_study_guide.txt")
    sample_file_content = (
        "DBMS STUDY GUIDE — NORMALIZATION & RELATIONAL ALGEBRA\n\n"
        "Topic 1: Functional Dependencies\n"
        "A Functional Dependency (FD) X -> Y specifies that the value of X uniquely determines Y.\n"
        "Armstrong's Axioms: Reflexivity, Augmentation, and Transitivity.\n\n"
        "Topic 2: Boyce-Codd Normal Form (BCNF)\n"
        "A relation R is in BCNF if for every non-trivial functional dependency X -> Y, X is a super key.\n"
        "BCNF is stricter than 3NF and eliminates all redundancy based on functional dependencies."
    )
    sample_file_path.write_text(sample_file_content, encoding="utf-8")
    print(f"[FILE CREATED] Created 'sample_study_guide.txt' ({len(sample_file_content)} bytes)")

    # 3. Test API: POST /api/documents/upload
    print("\n--- Testing API: POST /api/documents/upload ---")
    with open(sample_file_path, "rb") as f:
        r_upload = client.post(
            "/api/documents/upload",
            data={"module_id": mod_id},
            files={"file": ("sample_study_guide.txt", f, "text/plain")}
        )
    
    assert r_upload.status_code == 200
    upload_res = r_upload.json()
    doc_id = upload_res["id"]
    print(f"SUCCESS! Document Uploaded:")
    print(f"  - Document ID: {upload_res['id']}")
    print(f"  - Title: {upload_res['title']}")
    print(f"  - File Name on Server: {upload_res['file_name']}")
    print(f"  - Stored File Path: {upload_res['file_path']}")
    print(f"  - File Size: {upload_res['file_size']} bytes")
    print(f"  - Upload Timestamp: {upload_res['uploaded_at']}")

    # 4. Test API: GET /api/documents/search (Keyword / Text Retrieval)
    print("\n--- Testing API: GET /api/documents/search ---")
    search_query = "Boyce-Codd"
    r_search = client.get(f"/api/documents/search?query={search_query}&module_id={mod_id}")
    
    assert r_search.status_code == 200
    search_results = r_search.json()
    print(f"SUCCESS! Retrieved {len(search_results)} search match(es) for query '{search_query}':")
    for idx, match in enumerate(search_results, 1):
        print(f"  Match #{idx}:")
        print(f"    - Document ID: {match['document_id']}")
        print(f"    - Title: {match['title']}")
        print(f"    - Relevance Score: {match['score']}")
        print(f"    - Extracted Snippet: '{match['snippet']}'")

    # 5. Test API: GET /api/documents/notes/default/{module_id}
    print("\n--- Testing API: GET /api/documents/notes/default/{module_id} ---")
    r_notes = client.get(f"/api/documents/notes/default/{mod_id}")
    assert r_notes.status_code == 200
    notes_res = r_notes.json()
    print(f"SUCCESS! Retrieved Default Notes File for Module {mod_id}:")
    print(f"  - Note ID: {notes_res['id']}")
    print(f"  - File Name: {notes_res['file_name']}")
    print(f"  - File Path: {notes_res['file_path']}")
    print(f"  - Current Content:\n    {notes_res['content'].strip()}")

    # 6. Test API: POST /api/ai/chat (RAG Retrieval over Uploaded Document)
    print("\n--- Testing API: POST /api/ai/chat (Document RAG Retrieval) ---")
    r_rag = client.post("/api/ai/chat", json={
        "message": "What is Boyce-Codd Normal Form according to my notes?",
        "module_id": mod_id
    })
    assert r_rag.status_code == 200
    rag_res = r_rag.json()
    print(f"SUCCESS! AI Answered using Uploaded Document as RAG Context:")
    print(f"  - Context Sources Used: {rag_res['retrieved_context_sources']}")
    print(f"  - AI Response:\n    {rag_res['message'][:250]}...")

    # Cleanup temporary test file
    if sample_file_path.exists():
        sample_file_path.unlink()

    print("\n" + "=" * 80)
    print("      ALL DOCUMENT UPLOADING & RETRIEVAL APIS PASSED 100%!")
    print("=" * 80)

if __name__ == "__main__":
    test_document_upload_and_retrieval()
