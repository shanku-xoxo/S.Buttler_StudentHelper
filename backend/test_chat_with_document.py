from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine

client = TestClient(app)

def test_chat_with_attached_document():
    Base.metadata.create_all(bind=engine)
    
    # 1. Setup minimal academic hierarchy
    r_yr = client.post("/api/academic/years", json={"name": "2025-2026"})
    yr_id = r_yr.json()["id"]
    r_sem = client.post("/api/academic/semesters", json={"name": "Semester 4", "academic_year_id": yr_id})
    sem_id = r_sem.json()["id"]
    r_subj = client.post("/api/academic/subjects", json={"name": "Database Management Systems", "semester_id": sem_id, "code": "CS301"})
    subj_id = r_subj.json()["id"]
    r_mod = client.post("/api/academic/modules", json={"name": "Module 3 - Indexing", "subject_id": subj_id, "code": "MOD3"})
    mod_id = r_mod.json()["id"]

    # 2. Create sample document
    test_doc_content = (
        "B+ TREE INDEXING IN MODERN DATABASES\n\n"
        "Introduction:\n"
        "A B+ tree is an self-balancing tree data structure that maintains sorted data and allows searches, sequential access, insertions, and deletions in logarithmic time.\n\n"
        "Properties:\n"
        "- All leaves are at the exact same depth.\n"
        "- Internal nodes store search-key values and pointers to child nodes.\n"
        "- Leaf nodes are linked sequentially as a doubly-linked list for fast range scans.\n\n"
        "Fan-out and Performance:\n"
        "High fan-out reduces the tree height, typically resulting in 3 to 4 levels for millions of records."
    )
    doc_path = Path("sample_bplus_tree.txt")
    doc_path.write_text(test_doc_content, encoding="utf-8")

    # 3. Upload document
    with open(doc_path, "rb") as f:
        r_upload = client.post(
            "/api/documents/upload",
            data={"module_id": mod_id},
            files={"file": ("sample_bplus_tree.txt", f, "text/plain")}
        )
    assert r_upload.status_code == 200
    uploaded_doc = r_upload.json()
    doc_id = uploaded_doc["id"]
    print(f"Uploaded test doc with ID: {doc_id}")

    # 4. Chat with document attached: Summary query
    r_chat_summary = client.post("/api/ai/chat", json={
        "message": "Please summarize this document for me.",
        "module_id": mod_id,
        "document_id": doc_id
    })
    assert r_chat_summary.status_code == 200
    res_summary = r_chat_summary.json()
    print("AI Summary Response:\n", res_summary["message"])
    assert "sample_bplus_tree.txt" in res_summary["retrieved_context_sources"]
    assert res_summary["document_id"] == doc_id
    assert res_summary["document_title"] == "sample_bplus_tree.txt"
    assert "B+ tree" in res_summary["message"] or "INDEXING" in res_summary["message"]

    # 5. Chat with document attached: Specific Q&A
    r_chat_qa = client.post("/api/ai/chat", json={
        "message": "What is the leaf node property of B+ trees in this document?",
        "module_id": mod_id,
        "document_ids": [doc_id]
    })
    assert r_chat_qa.status_code == 200
    res_qa = r_chat_qa.json()
    print("AI Q&A Response:\n", res_qa["message"])
    assert "sample_bplus_tree.txt" in res_qa["retrieved_context_sources"]
    assert "linked" in res_qa["message"].lower() or "depth" in res_qa["message"].lower()

    # Cleanup
    if doc_path.exists():
        doc_path.unlink()

    print("ALL ATTACHED DOCUMENT CHAT TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_chat_with_attached_document()
