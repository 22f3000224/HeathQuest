"""
Migrate existing database to add JSON columns
"""
import json
import sqlite3
from datetime import datetime
from core.database import SessionLocal
from sqlalchemy import text

def migrate_to_json_structure():
    """Add JSON columns to existing tables and migrate data"""
    db = SessionLocal()
    
    try:
        print("Starting migration to JSON structure...")
        
        # 1. Add JSON column to daily_logs if it doesn't exist
        try:
            db.execute(text("ALTER TABLE daily_logs ADD COLUMN daily_entries TEXT DEFAULT '{}'"))
            db.commit()
            print("Added daily_entries column to daily_logs")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("daily_entries column already exists")
            else:
                print(f"Error adding daily_entries column: {e}")
        
        # 2. Migrate existing daily logs to JSON format
        try:
            # Get existing daily logs
            result = db.execute(text("""
                SELECT id, user_id, date, sleep, water, exercise, nutrition, mood 
                FROM daily_logs 
                WHERE daily_entries IS NULL OR daily_entries = '' OR daily_entries = '{}'
            """)).fetchall()
            
            if result:
                print(f"Migrating {len(result)} daily log entries...")
                
                # Group by user_id
                user_logs = {}
                for row in result:
                    log_id, user_id, log_date, sleep, water, exercise, nutrition, mood = row
                    
                    if user_id not in user_logs:
                        user_logs[user_id] = {"entries": {}, "ids": []}
                    
                    date_str = str(log_date)
                    user_logs[user_id]["entries"][date_str] = {
                        "sleep": sleep,
                        "water": water,
                        "exercise": exercise,
                        "nutrition": nutrition,
                        "mood": mood
                    }
                    user_logs[user_id]["ids"].append(log_id)
                
                # Update each user's logs with JSON data
                for user_id, data in user_logs.items():
                    json_data = json.dumps(data["entries"], indent=2)
                    
                    # Update the first log entry with JSON data
                    if data["ids"]:
                        first_id = data["ids"][0]
                        db.execute(text("""
                            UPDATE daily_logs 
                            SET daily_entries = :json_data,
                                updated_at = :updated_at
                            WHERE id = :id
                        """), {
                            "json_data": json_data, 
                            "updated_at": datetime.now(),
                            "id": first_id
                        })
                        
                        # Delete other duplicate entries for this user
                        for other_id in data["ids"][1:]:
                            db.execute(text("DELETE FROM daily_logs WHERE id = :id"), {"id": other_id})
                
                db.commit()
                print("Daily logs migrated to JSON format")
        except Exception as e:
            print(f"Error migrating daily logs: {e}")
        
        # 3. Add JSON column to chronicle_entries
        try:
            db.execute(text("ALTER TABLE chronicle_entries ADD COLUMN chronicle_data TEXT DEFAULT '{}'"))
            db.commit()
            print("Added chronicle_data column to chronicle_entries")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("chronicle_data column already exists")
        
        # 4. Migrate chronicle entries
        try:
            result = db.execute(text("""
                SELECT user_id, week_number, chapter_title, title, content, created_at 
                FROM chronicle_entries 
                WHERE chronicle_data IS NULL OR chronicle_data = '' OR chronicle_data = '{}'
            """)).fetchall()
            
            if result:
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
                
                # Clear old chronicle entries and add JSON versions
                db.execute(text("DELETE FROM chronicle_entries WHERE chronicle_data IS NULL OR chronicle_data = '' OR chronicle_data = '{}'"))
                
                for user_id, data in user_chronicles.items():
                    db.execute(text("""
                        INSERT INTO chronicle_entries (user_id, chronicle_data, created_at, updated_at)
                        VALUES (:user_id, :data, :created_at, :updated_at)
                    """), {
                        "user_id": user_id,
                        "data": json.dumps(data, indent=2),
                        "created_at": datetime.now(),
                        "updated_at": datetime.now()
                    })
                
                db.commit()
                print(f"Migrated chronicles for {len(user_chronicles)} users")
        except Exception as e:
            print(f"Error migrating chronicles: {e}")
        
        # 5. Add JSON columns to other tables
        tables_and_columns = [
            ("museum_artifacts", "artifacts_data"),
            ("memories", "memories_data"), 
            ("storybook_chapters", "chapters_data")
        ]
        
        for table, column in tables_and_columns:
            try:
                db.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} TEXT DEFAULT '{{}}'"))
                db.execute(text(f"ALTER TABLE {table} ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                db.commit()
                print(f"Added {column} column to {table}")
            except Exception as e:
                if "duplicate column name" in str(e).lower():
                    print(f"{column} column already exists in {table}")
        
        print("Migration completed!")
        
    except Exception as e:
        db.rollback()
        print(f"Migration error: {e}")
    finally:
        db.close()

def add_sample_json_data():
    """Add sample data to demonstrate JSON structure"""
    db = SessionLocal()
    
    try:
        # Add sample daily log with JSON
        sample_daily_entries = {
            "2024-01-15": {"sleep": 8, "water": 7, "exercise": "moderate", "nutrition": "good", "mood": 8},
            "2024-01-16": {"sleep": 7, "water": 6, "exercise": "light", "nutrition": "great", "mood": 9},
            "2024-01-17": {"sleep": 9, "water": 8, "exercise": "intense", "nutrition": "good", "mood": 7}
        }
        
        db.execute(text("""
            INSERT INTO daily_logs (user_id, daily_entries, created_at, updated_at)
            VALUES (1, :json_data, :created_at, :updated_at)
        """), {
            "json_data": json.dumps(sample_daily_entries, indent=2),
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        })
        
        db.commit()
        print("Added sample JSON daily log data")
        print("JSON Structure:")
        print(json.dumps(sample_daily_entries, indent=2))
        
    except Exception as e:
        print(f"Error adding sample data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_to_json_structure()
    add_sample_json_data()
    
    print("\\n=== MIGRATION COMPLETE ===")
    print("Your database now has JSON columns:")
    print("- daily_logs.daily_entries (stores day1, day2, etc. as JSON)")
    print("- chronicle_entries.chronicle_data (stores chronicle entries as JSON)")
    print("- museum_artifacts.artifacts_data (stores artifacts as JSON)")
    print("- memories.memories_data (stores memories as JSON)")
    print("- storybook_chapters.chapters_data (stores chapters as JSON)")
    print("\\nCheck your database browser to see the JSON data!")