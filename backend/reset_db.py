import os
from pathlib import Path
from app.database import engine, Base
import app.models  # MANDATORY: Import models so Base.metadata contains all tables!

def reset_database():
    db_file = Path(__file__).parent / "academic_assistant.db"
    print(f"Resetting database at {db_file} ...")
    
    # Close connections & delete file if exists for 100% clean wipe
    engine.dispose()
    if db_file.exists():
        try:
            os.remove(db_file)
            print("Deleted old database file.")
        except Exception as e:
            print(f"File delete failed, dropping tables via SQL: {e}")
            Base.metadata.drop_all(bind=engine)

    Base.metadata.create_all(bind=engine)
    print("Database reset successfully! All tables are now completely empty and fresh.")

if __name__ == "__main__":
    reset_database()
