#!/usr/bin/env python3
"""
Migration script for HealthQuest AI v2.0
Adds authentication, memory system, and enhanced artifact storage
"""

import os
import sys
from sqlalchemy import create_engine, inspect, text

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import BASE_DIR, DATABASE_URL

def run_migration():
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    print("Running HealthQuest AI v2.0 Migration")
    print(f"Database: {DATABASE_URL}")
    
    with engine.begin() as conn:
        # 1. Add authentication columns to users table
        if "users" in existing_tables:
            existing_columns = {col["name"] for col in inspector.get_columns("users")}
            
            if "username" not in existing_columns:
                print("Adding username column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(50)"))
                conn.execute(text("CREATE UNIQUE INDEX ix_users_username ON users(username)"))
            
            if "email" not in existing_columns:
                print("Adding email column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(120)"))
                conn.execute(text("CREATE UNIQUE INDEX ix_users_email ON users(email)"))
            
            if "password_hash" not in existing_columns:
                print("Adding password_hash column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
        
        # 2. Create memories table
        if "memories" not in existing_tables:
            print("Creating memories table...")
            conn.execute(text("""
                CREATE TABLE memories (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    memory_type VARCHAR(50) NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    summary TEXT NOT NULL,
                    importance_score INTEGER NOT NULL DEFAULT 5,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """))
            conn.execute(text("CREATE INDEX ix_memories_user_id ON memories(user_id)"))
        
        # 3. Create storybook_chapters table
        if "storybook_chapters" not in existing_tables:
            print("Creating storybook_chapters table...")
            conn.execute(text("""
                CREATE TABLE storybook_chapters (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    chapter_number INTEGER NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    content TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """))
            conn.execute(text("CREATE INDEX ix_storybook_chapters_user_id ON storybook_chapters(user_id)"))
        
        # 4. Add enhanced fields to chronicle_entries
        if "chronicle_entries" in existing_tables:
            existing_columns = {col["name"] for col in inspector.get_columns("chronicle_entries")}
            
            if "week_number" not in existing_columns:
                print("Adding week_number to chronicle_entries...")
                conn.execute(text("ALTER TABLE chronicle_entries ADD COLUMN week_number INTEGER"))
            
            if "chapter_title" not in existing_columns:
                print("Adding chapter_title to chronicle_entries...")
                conn.execute(text("ALTER TABLE chronicle_entries ADD COLUMN chapter_title VARCHAR(200)"))
        
        # 5. Add enhanced fields to museum_artifacts
        if "museum_artifacts" in existing_tables:
            existing_columns = {col["name"] for col in inspector.get_columns("museum_artifacts")}
            
            if "lore" not in existing_columns:
                print("Adding lore column to museum_artifacts...")
                conn.execute(text("ALTER TABLE museum_artifacts ADD COLUMN lore TEXT"))
            
            if "unlocked_at" not in existing_columns:
                print("Adding unlocked_at column to museum_artifacts...")
                conn.execute(text("ALTER TABLE museum_artifacts ADD COLUMN unlocked_at DATETIME"))
    
    print("Migration completed successfully!")
    print("\nNext steps:")
    print("1. Restart the backend server")
    print("2. Users can now register/login with authentication")
    print("3. Memory system will track important sanctuary events")
    print("4. AI will have full context of user's journey")

if __name__ == "__main__":
    run_migration()