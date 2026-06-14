"""
Migration script to convert existing database structure to JSON-based format
"""
import sqlite3
import json
from datetime import datetime
from core.database import engine, SessionLocal
from sqlalchemy import text

def migrate_daily_logs():
    """Migrate daily logs to JSON format"""
    db = SessionLocal()
    
    try:
        # Get existing daily logs
        result = db.execute(text("""
            SELECT user_id, date, sleep, water, exercise, nutrition, mood 
            FROM daily_logs
        """)).fetchall()
        
        # Group by user_id
        user_logs = {}
        for row in result:
            user_id = row[0]
            if user_id not in user_logs:
                user_logs[user_id] = {}
            
            date_str = str(row[1])
            user_logs[user_id][date_str] = {
                "sleep": row[2],
                "water": row[3], 
                "exercise": row[4],
                "nutrition": row[5],
                "mood": row[6]
            }
        
        # Drop old table and create new structure
        db.execute(text("DROP TABLE IF EXISTS daily_logs_backup"))
        db.execute(text("ALTER TABLE daily_logs RENAME TO daily_logs_backup"))
        
        # Create new table with JSON structure
        db.execute(text("""
            CREATE TABLE daily_logs (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                daily_entries TEXT NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """))
        
        # Insert migrated data
        for user_id, entries in user_logs.items():
            db.execute(text("""
                INSERT INTO daily_logs (user_id, daily_entries)
                VALUES (:user_id, :entries)
            """), {"user_id": user_id, "entries": json.dumps(entries)})
        
        db.commit()
        print(f"Migrated daily logs for {len(user_logs)} users")
        
    except Exception as e:
        db.rollback()
        print(f"Error migrating daily logs: {e}")
    finally:
        db.close()

def migrate_chronicles():
    """Migrate chronicle entries to JSON format"""
    db = SessionLocal()
    
    try:
        result = db.execute(text("""
            SELECT user_id, week_number, chapter_title, title, content, created_at 
            FROM chronicle_entries
        """)).fetchall()
        
        user_chronicles = {}
        for row in result:
            user_id = row[0]
            if user_id not in user_chronicles:
                user_chronicles[user_id] = {"entries": []}
            
            user_chronicles[user_id]["entries"].append({
                "week_number": row[1],
                "chapter_title": row[2],
                "title": row[3],
                "content": row[4],
                "created_at": str(row[5])
            })
        
        db.execute(text("DROP TABLE IF EXISTS chronicle_entries_backup"))
        db.execute(text("ALTER TABLE chronicle_entries RENAME TO chronicle_entries_backup"))
        
        db.execute(text("""
            CREATE TABLE chronicle_entries (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                chronicle_data TEXT NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """))
        
        for user_id, data in user_chronicles.items():
            db.execute(text("""
                INSERT INTO chronicle_entries (user_id, chronicle_data)
                VALUES (:user_id, :data)
            """), {"user_id": user_id, "data": json.dumps(data)})
        
        db.commit()
        print(f"Migrated chronicles for {len(user_chronicles)} users")
        
    except Exception as e:
        db.rollback()
        print(f"Error migrating chronicles: {e}")
    finally:
        db.close()

def migrate_artifacts():
    """Migrate museum artifacts to JSON format"""
    db = SessionLocal()
    
    try:
        result = db.execute(text("""
            SELECT user_id, artifact_name, description, lore, unlocked, unlock_date, unlocked_at
            FROM museum_artifacts
        """)).fetchall()
        
        user_artifacts = {}
        for row in result:
            user_id = row[0]
            if user_id not in user_artifacts:
                user_artifacts[user_id] = {"artifacts": []}
            
            user_artifacts[user_id]["artifacts"].append({
                "artifact_name": row[1],
                "description": row[2],
                "lore": row[3],
                "unlocked": bool(row[4]),
                "unlock_date": str(row[5]) if row[5] else None,
                "unlocked_at": str(row[6]) if row[6] else None
            })
        
        db.execute(text("DROP TABLE IF EXISTS museum_artifacts_backup"))
        db.execute(text("ALTER TABLE museum_artifacts RENAME TO museum_artifacts_backup"))
        
        db.execute(text("""
            CREATE TABLE museum_artifacts (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                artifacts_data TEXT NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """))
        
        for user_id, data in user_artifacts.items():
            db.execute(text("""
                INSERT INTO museum_artifacts (user_id, artifacts_data)
                VALUES (:user_id, :data)
            """), {"user_id": user_id, "data": json.dumps(data)})
        
        db.commit()
        print(f"Migrated artifacts for {len(user_artifacts)} users")
        
    except Exception as e:
        db.rollback()
        print(f"Error migrating artifacts: {e}")
    finally:
        db.close()

def migrate_memories():
    """Migrate memories to JSON format"""
    db = SessionLocal()
    
    try:
        result = db.execute(text("""
            SELECT user_id, memory_type, title, summary, importance_score, created_at
            FROM memories
        """)).fetchall()
        
        user_memories = {}
        for row in result:
            user_id = row[0]
            if user_id not in user_memories:
                user_memories[user_id] = {"memories": []}
            
            user_memories[user_id]["memories"].append({
                "memory_type": row[1],
                "title": row[2],
                "summary": row[3],
                "importance_score": row[4],
                "created_at": str(row[5])
            })
        
        db.execute(text("DROP TABLE IF EXISTS memories_backup"))
        db.execute(text("ALTER TABLE memories RENAME TO memories_backup"))
        
        db.execute(text("""
            CREATE TABLE memories (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                memories_data TEXT NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """))
        
        for user_id, data in user_memories.items():
            db.execute(text("""
                INSERT INTO memories (user_id, memories_data)
                VALUES (:user_id, :data)
            """), {"user_id": user_id, "data": json.dumps(data)})
        
        db.commit()
        print(f"Migrated memories for {len(user_memories)} users")
        
    except Exception as e:
        db.rollback()
        print(f"Error migrating memories: {e}")
    finally:
        db.close()

def migrate_storybook():
    """Migrate storybook chapters to JSON format"""
    db = SessionLocal()
    
    try:
        result = db.execute(text("""
            SELECT user_id, chapter_number, title, content, created_at
            FROM storybook_chapters
        """)).fetchall()
        
        user_chapters = {}
        for row in result:
            user_id = row[0]
            if user_id not in user_chapters:
                user_chapters[user_id] = {"chapters": []}
            
            user_chapters[user_id]["chapters"].append({
                "chapter_number": row[1],
                "title": row[2],
                "content": row[3],
                "created_at": str(row[4])
            })
        
        db.execute(text("DROP TABLE IF EXISTS storybook_chapters_backup"))
        db.execute(text("ALTER TABLE storybook_chapters RENAME TO storybook_chapters_backup"))
        
        db.execute(text("""
            CREATE TABLE storybook_chapters (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                chapters_data TEXT NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """))
        
        for user_id, data in user_chapters.items():
            db.execute(text("""
                INSERT INTO storybook_chapters (user_id, chapters_data)
                VALUES (:user_id, :data)
            """), {"user_id": user_id, "data": json.dumps(data)})
        
        db.commit()
        print(f"Migrated storybook chapters for {len(user_chapters)} users")
        
    except Exception as e:
        db.rollback()
        print(f"Error migrating storybook: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting database migration to JSON structure...")
    migrate_daily_logs()
    migrate_chronicles() 
    migrate_artifacts()
    migrate_memories()
    migrate_storybook()
    print("Migration complete!")