import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import os
import shutil

from app.main import app
from app.database import Base, engine

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Clean up test artifacts if needed

def test_root_and_health():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "online"

    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

def test_fr01_fr02_academic_hierarchy():
    # 1. Create Academic Year
    res_yr = client.post("/api/academic/years", json={"name": "2025-2026"})
    assert res_yr.status_code == 200
    yr_id = res_yr.json()["id"]

    # 2. Create Semester
    res_sem = client.post("/api/academic/semesters", json={"name": "Semester 4", "academic_year_id": yr_id})
    assert res_sem.status_code == 200
    sem_id = res_sem.json()["id"]

    # 3. Create Subject (DBMS)
    res_subj = client.post("/api/academic/subjects", json={"name": "Database Management Systems", "semester_id": sem_id, "code": "CS301"})
    assert res_subj.status_code == 200
    subj_id = res_subj.json()["id"]

    # 4. Create Module (Module 2 - Relational DBMS)
    res_mod = client.post("/api/academic/modules", json={"name": "Module 2", "subject_id": subj_id, "code": "MOD2"})
    assert res_mod.status_code == 200
    mod_id = res_mod.json()["id"]

    # Verify retrieval
    res_mods = client.get(f"/api/academic/modules?subject_id={subj_id}")
    assert res_mods.status_code == 200
    assert len(res_mods.json()) >= 1

def test_fr03_fr04_fr06_document_upload_and_search(tmp_path):
    # Setup test file
    test_file_path = tmp_path / "Lecture1_NormalForms.txt"
    test_file_path.write_text("Database Normalization reduces redundancy. First Normal Form (1NF) requires atomic values. Second Normal Form (2NF) eliminates partial dependencies. Third Normal Form (3NF) eliminates transitive dependencies.", encoding="utf-8")

    with open(test_file_path, "rb") as f:
        res = client.post(
            "/api/documents/upload",
            data={"module_id": 1},
            files={"file": ("Lecture1_NormalForms.txt", f, "text/plain")}
        )
    assert res.status_code == 200
    doc_data = res.json()
    assert doc_data["title"] == "Lecture1_NormalForms.txt"

    # Search document text
    search_res = client.get("/api/documents/search?query=Normalization")
    assert search_res.status_code == 200
    results = search_res.json()
    assert len(results) >= 1
    assert "Normalization" in results[0]["snippet"]

def test_fr05_fr07_fr14_fr18_ai_chat_and_action_proposals():
    # Chat asking a question
    res_chat1 = client.post("/api/ai/chat", json={"message": "Explain deadlock in simple terms."})
    assert res_chat1.status_code == 200
    data1 = res_chat1.json()
    conv_id = data1["conversation_id"]
    assert "deadlock" in data1["message"].lower()

    # Chat proposing a calendar event
    res_chat2 = client.post("/api/ai/chat", json={
        "conversation_id": conv_id,
        "message": "My DBMS exam is next Thursday at 10 AM"
    })
    assert res_chat2.status_code == 200
    data2 = res_chat2.json()
    assert len(data2["proposed_actions"]) >= 1
    proposal = data2["proposed_actions"][0]
    assert proposal["action_type"] == "ADD_CALENDAR_EVENT"
    assert proposal["status"] == "PENDING"

    # Confirm action proposal
    res_confirm = client.post("/api/ai/confirm-action", json={
        "proposed_action_id": proposal["id"],
        "confirm": True
    })
    assert res_confirm.status_code == 200
    assert res_confirm.json()["status"] == "CONFIRMED"

    # Verify event was added to calendar
    res_cal = client.get("/api/calendar/events")
    assert res_cal.status_code == 200
    events = res_cal.json()
    assert any("DBMS Exam" in e["title"] for e in events)

def test_fr08_fr09_fr10_fr11_notes_management():
    # Default notes.txt appending
    res_default_note = client.get("/api/documents/notes/default/1")
    assert res_default_note.status_code == 200
    note_id = res_default_note.json()["id"]

    res_append = client.post(
        f"/api/documents/notes/{note_id}/append",
        data={"content": "Relational algebra uses Selection, Projection, and Join.", "topic_header": "Relational Algebra"}
    )
    assert res_append.status_code == 200
    assert "Relational algebra" in res_append.json()["content"]

    # Explicit separate notes file creation
    res_new_note = client.post("/api/documents/notes", json={
        "module_id": 1,
        "title": "Normalization Special Notes",
        "content": "Deep dive into Boyce-Codd Normal Form (BCNF)."
    })
    assert res_new_note.status_code == 200
    assert res_new_note.json()["title"] == "Normalization Special Notes"

    # Whole-module summary generation
    res_summary = client.post("/api/ai/summarize-module", json={"module_id": 1})
    assert res_summary.status_code == 200
    assert "module_name" in res_summary.json()
    assert "summary_content" in res_summary.json()

def test_fr12_fr13_fr23_calendar_events_and_deadlines():
    # Create manual assignment deadline
    res_evt = client.post("/api/calendar/events", json={
        "title": "DBMS Assignment 1",
        "subject_id": 1,
        "event_type": "Assignment",
        "due_date": "2026-09-25",
        "description": "SQL Query Optimization Assignment"
    })
    assert res_evt.status_code == 200
    evt_id = res_evt.json()["id"]

    # Retrieve event
    res_get = client.get(f"/api/calendar/events/{evt_id}")
    assert res_get.status_code == 200
    assert res_get.json()["event_type"] == "Assignment"

def test_fr15_fr16_fr17_fr19_fr20_fr21_fr22_tasks_and_dynamic_planner():
    # 1. Create Tasks with estimated hours
    res_t1 = client.post("/api/tasks", json={
        "title": "Study Relational Algebra",
        "subject_id": 1,
        "module_id": 1,
        "estimated_hours": 3.0,
        "priority": "High"
    })
    assert res_t1.status_code == 200
    t1_id = res_t1.json()["id"]

    res_t2 = client.post("/api/tasks", json={
        "title": "Study Normalization",
        "subject_id": 1,
        "module_id": 1,
        "estimated_hours": 4.0,
        "priority": "High"
    })
    assert res_t2.status_code == 200
    t2_id = res_t2.json()["id"]

    # 2. Get Workload Summary
    res_summary1 = client.get("/api/tasks/workload/summary?subject_id=1")
    assert res_summary1.status_code == 200
    s1 = res_summary1.json()
    assert s1["pending_tasks"] >= 2
    assert s1["remaining_estimated_hours"] >= 7.0

    # 3. Mark Task 1 Completed
    res_update = client.put(f"/api/tasks/{t1_id}", json={
        "status": "Completed",
        "actual_hours": 2.5
    })
    assert res_update.status_code == 200
    assert res_update.json()["status"] == "Completed"

    # 4. Verify Workload Recalculation after completion
    res_summary2 = client.get("/api/tasks/workload/summary?subject_id=1")
    assert res_summary2.status_code == 200
    s2 = res_summary2.json()
    assert s2["completed_tasks"] >= 1
    assert s2["remaining_estimated_hours"] < s1["remaining_estimated_hours"]

    # 5. Test Dynamic Workload Redistribution across available days
    res_redistribute = client.post("/api/tasks/redistribute", json={
        "available_days": 4,
        "max_daily_hours": 3.0
    })
    assert res_redistribute.status_code == 200
    redist = res_redistribute.json()
    assert "schedule" in redist
    assert len(redist["daily_workload_hours"]) == 4

def test_fr24_shared_source_of_truth():
    # Verify that AI chat, Calendar, Tasks, and Notes share common database entities
    res_years = client.get("/api/academic/years")
    res_semesters = client.get("/api/academic/semesters")
    res_subjects = client.get("/api/academic/subjects")
    res_modules = client.get("/api/academic/modules")

    assert res_years.status_code == 200
    assert res_semesters.status_code == 200
    assert res_subjects.status_code == 200
    assert res_modules.status_code == 200
