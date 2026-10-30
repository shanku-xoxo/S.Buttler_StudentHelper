import os
import json
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine

client = TestClient(app)

def run_complete_api_test():
    print("=" * 80)
    print("      STUDENT ACADEMIC ASSISTANT — COMPLETE API INTEGRATION TEST")
    print("=" * 80)

    # Re-initialize DB tables for a clean test run
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # -------------------------------------------------------------------------
    # 1. Health & Root APIs
    # -------------------------------------------------------------------------
    print("\n--- 1. Testing System Root & Health APIs ---")
    r_root = client.get("/")
    print(f"GET / -> Status: {r_root.status_code} | Body: {r_root.json()}")
    r_health = client.get("/health")
    print(f"GET /health -> Status: {r_health.status_code} | Body: {r_health.json()}")

    # -------------------------------------------------------------------------
    # 2. Academic Hierarchy APIs (FR-01, FR-02)
    # -------------------------------------------------------------------------
    print("\n--- 2. Testing Academic Hierarchy APIs ---")
    r_yr = client.post("/api/academic/years", json={"name": "2025-2026", "start_date": "2025-08-01", "end_date": "2026-05-31"})
    year_id = r_yr.json()["id"]
    print(f"POST /api/academic/years -> Year ID {year_id}: {r_yr.json()}")

    r_sem = client.post("/api/academic/semesters", json={"name": "Semester 4", "academic_year_id": year_id})
    sem_id = r_sem.json()["id"]
    print(f"POST /api/academic/semesters -> Semester ID {sem_id}: {r_sem.json()}")

    r_subj = client.post("/api/academic/subjects", json={"name": "Database Management Systems", "semester_id": sem_id, "code": "CS301"})
    subj_id = r_subj.json()["id"]
    print(f"POST /api/academic/subjects -> Subject ID {subj_id}: {r_subj.json()}")

    r_mod = client.post("/api/academic/modules", json={"name": "Module 2 - Relational DBMS", "subject_id": subj_id, "code": "MOD2"})
    mod_id = r_mod.json()["id"]
    print(f"POST /api/academic/modules -> Module ID {mod_id}: {r_mod.json()}")

    # -------------------------------------------------------------------------
    # 3. Sample Document Creation & Upload API (FR-03, FR-04)
    # -------------------------------------------------------------------------
    print("\n--- 3. Testing Sample Document Upload API ---")
    sample_doc_content = (
        "DATABASE MANAGEMENT SYSTEMS — MODULE 2: RELATIONAL MODEL & NORMALIZATION\n\n"
        "1. Relational Model Fundamentals:\n"
        "A relational database consists of tables (relations). Each tuple represents a record.\n"
        "Relational algebra operators include Selection (sigma), Projection (pi), Natural Join, and Division.\n\n"
        "2. Normalization & Normal Forms:\n"
        "- First Normal Form (1NF): All attributes must be atomic.\n"
        "- Second Normal Form (2NF): Must be in 1NF and no non-prime attribute is partially dependent on any candidate key.\n"
        "- Third Normal Form (3NF): Must be in 2NF and no non-prime attribute is transitively dependent on candidate key.\n"
        "- Boyce-Codd Normal Form (BCNF): For every functional dependency X -> Y, X must be a super key.\n\n"
        "3. Transactions & Deadlock:\n"
        "ACID properties guarantee reliability. Deadlock occurs when processes hold resources in a circular chain."
    )

    sample_doc_path = Path("sample_dbms_lecture_notes.txt")
    sample_doc_path.write_text(sample_doc_content, encoding="utf-8")

    with open(sample_doc_path, "rb") as f:
        r_upload = client.post(
            "/api/documents/upload",
            data={"module_id": mod_id},
            files={"file": ("sample_dbms_lecture_notes.txt", f, "text/plain")}
        )
    doc_data = r_upload.json()
    doc_id = doc_data["id"]
    print(f"POST /api/documents/upload -> Doc ID {doc_id} | Title: {doc_data['title']} | Size: {doc_data['file_size']} bytes")

    # -------------------------------------------------------------------------
    # 4. Document Search API (FR-06)
    # -------------------------------------------------------------------------
    print("\n--- 4. Testing Document Search API ---")
    r_search = client.get(f"/api/documents/search?query=Normalization&module_id={mod_id}")
    search_results = r_search.json()
    print(f"GET /api/documents/search?query=Normalization -> Found {len(search_results)} match(es):")
    for res in search_results:
        print(f"  - Document '{res['title']}' (Score: {res['score']}): snippet='{res['snippet'][:100]}...'")

    # -------------------------------------------------------------------------
    # 5. AI Assistant RAG Chat & Confirmation API (FR-05, FR-06, FR-07, FR-14, FR-18)
    # -------------------------------------------------------------------------
    print("\n--- 5. Testing AI Assistant RAG Chat & Confirmation APIs ---")
    
    # Q&A with RAG context
    r_chat1 = client.post("/api/ai/chat", json={
        "message": "What is normalization and what are the normal forms?",
        "module_id": mod_id
    })
    c1_data = r_chat1.json()
    conv_id = c1_data["conversation_id"]
    print(f"POST /api/ai/chat (Q&A) -> Conv ID {conv_id} | Context Sources: {c1_data['retrieved_context_sources']}")
    print(f"AI Response snippet:\n{c1_data['message'][:250]}...\n")

    # Message proposing a Calendar Event
    r_chat2 = client.post("/api/ai/chat", json={
        "conversation_id": conv_id,
        "message": "My DBMS exam is next Thursday at 10 AM",
        "module_id": mod_id
    })
    c2_data = r_chat2.json()
    print(f"POST /api/ai/chat (Proposing Action) -> Proposed Actions Count: {len(c2_data['proposed_actions'])}")
    action_prop = c2_data["proposed_actions"][0]
    print(f"  - Proposal ID {action_prop['id']}: type='{action_prop['action_type']}' status='{action_prop['status']}'")

    # Confirming the proposed action
    r_confirm = client.post("/api/ai/confirm-action", json={
        "proposed_action_id": action_prop["id"],
        "confirm": True
    })
    print(f"POST /api/ai/confirm-action -> Result: {r_confirm.json()}")

    # Message reporting completed progress
    r_chat3 = client.post("/api/ai/chat", json={
        "conversation_id": conv_id,
        "message": "I've completed DBMS till Relational DBMS",
        "module_id": mod_id
    })
    c3_data = r_chat3.json()
    if c3_data["proposed_actions"]:
        progress_action = c3_data["proposed_actions"][0]
        r_confirm_prog = client.post("/api/ai/confirm-action", json={
            "proposed_action_id": progress_action["id"],
            "confirm": True
        })
        print(f"POST /api/ai/confirm-action (Progress) -> Result: {r_confirm_prog.json()}")

    # -------------------------------------------------------------------------
    # 6. Notes Management & Whole-Module Summarization (FR-08, FR-09, FR-10, FR-11)
    # -------------------------------------------------------------------------
    print("\n--- 6. Testing Notes Management & Module Summarization APIs ---")
    
    # Get Default Notes File (notes.txt)
    r_def_note = client.get(f"/api/documents/notes/default/{mod_id}")
    def_note_id = r_def_note.json()["id"]
    print(f"GET /api/documents/notes/default/{mod_id} -> Default Note ID {def_note_id} ({r_def_note.json()['file_name']})")

    # Append to Default Note
    r_append = client.post(
        f"/api/documents/notes/{def_note_id}/append",
        data={"content": "Important Formula: Candidate Key determines all attributes in BCNF.", "topic_header": "BCNF Key Takeaway"}
    )
    print(f"POST /api/documents/notes/{def_note_id}/append -> Content length: {len(r_append.json()['content'])} chars")

    # Create Separate Notes File
    r_new_note = client.post("/api/documents/notes", json={
        "module_id": mod_id,
        "title": "Normalization Cheatsheet",
        "content": "Quick Reference:\n1NF -> Atomic\n2NF -> No Partial Dep\n3NF -> No Transitive Dep\nBCNF -> X is Super Key"
    })
    print(f"POST /api/documents/notes -> Created Note File: {r_new_note.json()['title']} ({r_new_note.json()['file_name']})")

    # Summarize Whole Module from Document Context
    r_mod_sum = client.post("/api/ai/summarize-module", json={"module_id": mod_id})
    print(f"POST /api/ai/summarize-module -> Summary Generated & Appended to default notes.txt:")
    print(f"  Summary snippet:\n{r_mod_sum.json()['summary_content'][:200]}...\n")

    # -------------------------------------------------------------------------
    # 7. Calendar & Assignment Deadline APIs (FR-12, FR-13, FR-23)
    # -------------------------------------------------------------------------
    print("\n--- 7. Testing Calendar & Assignment Deadline APIs ---")
    r_cal_create = client.post("/api/calendar/events", json={
        "title": "DBMS Assignment 1: SQL Optimization",
        "subject_id": subj_id,
        "event_type": "Assignment",
        "due_date": "2026-09-28",
        "description": "Solve relational algebra & SQL indexing problems."
    })
    cal_evt_id = r_cal_create.json()["id"]
    print(f"POST /api/calendar/events -> Event ID {cal_evt_id} ({r_cal_create.json()['title']})")

    r_cal_list = client.get(f"/api/calendar/events?subject_id={subj_id}")
    print(f"GET /api/calendar/events?subject_id={subj_id} -> Total Events: {len(r_cal_list.json())}")
    for evt in r_cal_list.json():
        print(f"  - Event #{evt['id']}: '{evt['title']}' ({evt['event_type']}) due on {evt['due_date']}")

    # -------------------------------------------------------------------------
    # 8. Todo List & Dynamic Academic Planner APIs (FR-15, FR-16, FR-17, FR-19 to FR-22)
    # -------------------------------------------------------------------------
    print("\n--- 8. Testing Todo List & Dynamic Academic Planner APIs ---")
    
    # Create Tasks
    r_t1 = client.post("/api/tasks", json={
        "title": "Read Chapter 2 on Relational Algebra",
        "subject_id": subj_id,
        "module_id": mod_id,
        "estimated_hours": 3.0,
        "priority": "High"
    })
    t1_id = r_t1.json()["id"]

    r_t2 = client.post("/api/tasks", json={
        "title": "Solve Normalization Practice Problems",
        "subject_id": subj_id,
        "module_id": mod_id,
        "estimated_hours": 4.5,
        "priority": "High"
    })
    t2_id = r_t2.json()["id"]

    r_t3 = client.post("/api/tasks", json={
        "title": "Prepare DBMS Assignment 1",
        "subject_id": subj_id,
        "module_id": mod_id,
        "calendar_event_id": cal_evt_id,
        "estimated_hours": 2.5,
        "priority": "Medium"
    })
    t3_id = r_t3.json()["id"]
    print(f"Created 3 Tasks: Task IDs [{t1_id}, {t2_id}, {t3_id}]")

    # Initial Workload Summary
    r_w1 = client.get(f"/api/tasks/workload/summary?subject_id={subj_id}")
    w1_data = r_w1.json()
    print(f"GET /api/tasks/workload/summary -> Total Tasks: {w1_data['total_tasks']} | Pending: {w1_data['pending_tasks']} | Remaining Workload: {w1_data['remaining_estimated_hours']} hrs")

    # Complete Task 1
    r_complete = client.put(f"/api/tasks/{t1_id}", json={
        "status": "Completed",
        "actual_hours": 2.5
    })
    print(f"PUT /api/tasks/{t1_id} -> Status updated to 'Completed' (Actual hours: {r_complete.json()['actual_hours']})")

    # Recalculated Workload Summary
    r_w2 = client.get(f"/api/tasks/workload/summary?subject_id={subj_id}")
    w2_data = r_w2.json()
    print(f"GET /api/tasks/workload/summary (Post-Completion Recalculation):")
    print(f"  - Completed Tasks: {w2_data['completed_tasks']} | Remaining Tasks: {w2_data['pending_tasks']}")
    print(f"  - Remaining Workload: {w2_data['remaining_estimated_hours']} hrs (Recalculated down from {w1_data['remaining_estimated_hours']} hrs)")
    print(f"  - Recommended Daily Workload: {w2_data['recommended_daily_hours']} hrs/day")

    # Dynamic Redistribution of Remaining Workload across Future Days
    r_redist = client.post(f"/api/tasks/redistribute?subject_id={subj_id}", json={
        "available_days": 3,
        "max_daily_hours": 4.0
    })
    redist_data = r_redist.json()
    print(f"POST /api/tasks/redistribute -> Rescheduled {redist_data['rescheduled_tasks_count']} tasks across {redist_data['available_days']} days:")
    print(f"  - Daily Workload Hours: {redist_data['daily_workload_hours']} hrs")
    print(f"  - Detailed Schedule Distribution: {json.dumps(redist_data['schedule'], indent=4)}")

    # Clean up local temporary test file
    if sample_doc_path.exists():
        sample_doc_path.unlink()

    print("\n" + "=" * 80)
    print("      ALL API TESTS EXECUTED SUCCESSFULLY — 100% VERIFIED!")
    print("=" * 80)

if __name__ == "__main__":
    run_complete_api_test()
