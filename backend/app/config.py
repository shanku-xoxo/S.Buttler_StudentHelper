import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
# Load .env from backend and root
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
NOTES_DIR = STORAGE_DIR / "notes"

# Create directories if they don't exist
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
NOTES_DIR.mkdir(parents=True, exist_ok=True)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'academic_assistant.db'}")

# Gemini AI API Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

# Ollama AI Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

# Academic & Task Estimation Defaults
DEFAULT_TASK_ESTIMATES = {
    "Exam Preparation": 10.0,
    "Assignment": 4.0,
    "Module Study": 6.0,
    "Revision": 2.0,
    "Default": 2.5
}

