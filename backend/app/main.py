from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import academic, documents, calendar, tasks, ai

# Initialize Database Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Student Academic Assistant Backend",
    description="Unified backend REST API for AI Assistant, Calendar & Deadlines, Todo & Dynamic Planner, and Notes & Document Manager.",
    version="1.0.0"
)

# CORS Middleware Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(academic.router)
app.include_router(documents.router)
app.include_router(calendar.router)
app.include_router(tasks.router)
app.include_router(ai.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Student Academic Assistant API",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "healthy"}
