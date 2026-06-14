from datetime import date
from typing import Dict, Optional
import json
from sqlalchemy.orm import Session
from core.models import User, DailyLog, SanctuaryState, MuseumArtifact, StorybookChapter, ChronicleEntry, Memory
from services.xp_calculator import calculate_user_xp, calculate_level, calculate_next_level_xp
from services.sanctuary_service import get_sanctuary_state, default_sanctuary_state


def get_user_initialization_data(db: Session, user_id: int) -> Dict:
    """
    Get complete user initialization data for login reconstruction.
    Returns all data needed to fully rebuild application state.
    Ensures new users get proper default values.
    """
    # Get user profile
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    
    # Ensure existing users have a companion (for routing logic)
    if not user.companion:
        # Set default companion for existing users who don't have one
        user.companion = "fox"
        db.commit()
        db.refresh(user)
    
    # Get sanctuary state - create if doesn't exist
    sanctuary = db.query(SanctuaryState).filter(SanctuaryState.user_id == user_id).first()
    if not sanctuary:
        # New user - create default sanctuary
        sanctuary = SanctuaryState(
            user_id=user_id,
            sky="cloudy",
            river="low", 
            forest="sparse",
            weather="overcast",
            season="spring",
            animal="resting",
            expression="calm",
            crystal_level=0,
            river_level=0,
            forest_level=0,
            lantern_level=0,
            day_count=0,
            xp=0,  # NEW USER STARTS WITH 0 XP
            level=1,
            next_level_xp=100,
            xp_awarded_today=0
        )
        db.add(sanctuary)
        db.commit()
        db.refresh(sanctuary)
    
    # Get all daily logs (last 90 days)
    daily_logs = (
        db.query(DailyLog)
        .filter(DailyLog.user_id == user_id)
        .order_by(DailyLog.created_at.desc())
        .limit(90)
        .all()
    )
    
    # Get today's log specifically
    today_log_data = None
    if daily_logs:
        latest_log = daily_logs[0]
        try:
            entries = json.loads(latest_log.daily_entries) if latest_log.daily_entries else {}
            today_str = date.today().isoformat()
            if today_str in entries:
                entry_data = entries[today_str]
                today_log_data = {
                    "id": latest_log.id,
                    "date": today_str,
                    "sleep": entry_data.get("sleep", 0),
                    "water": entry_data.get("water", 0),
                    "exercise": entry_data.get("exercise", 0),
                    "nutrition": entry_data.get("nutrition", 0),
                    "mood": entry_data.get("mood", 0),
                    "created_at": latest_log.created_at.isoformat() if latest_log.created_at else None
                }
        except (json.JSONDecodeError, AttributeError):
            pass
    
    # Get museum progress - ensure starter artifact exists
    from services.museum_curator import MuseumCurator
    curator = MuseumCurator(db)
    curator.ensure_artifact_record(user_id)  # Ensure Leaf Chronicle exists
    
    museum_artifacts = (
        db.query(MuseumArtifact)
        .filter(MuseumArtifact.user_id == user_id)
        .all()
    )
    
    # Get storybook chapters
    storybook_chapters = (
        db.query(StorybookChapter)
        .filter(StorybookChapter.user_id == user_id)
        .order_by(StorybookChapter.chapter_number)
        .all()
    )
    
    # Get chronicle entries
    chronicles = (
        db.query(ChronicleEntry)
        .filter(ChronicleEntry.user_id == user_id)
        .order_by(ChronicleEntry.created_at.desc())
        .limit(20)
        .all()
    )
    
    # Get memories
    memories = (
        db.query(Memory)
        .filter(Memory.user_id == user_id)
        .order_by(Memory.created_at.desc())
        .limit(50)
        .all()
    )
    
    # Calculate XP and progression - ALWAYS recalculate from actual data
    xp_data = calculate_user_xp(db, user_id)
    
    # Update sanctuary XP to match calculated XP
    if sanctuary.xp != xp_data['total_xp']:
        sanctuary.xp = xp_data['total_xp']
        sanctuary.level = calculate_level(xp_data['total_xp'])
        sanctuary.next_level_xp = calculate_next_level_xp(sanctuary.level)
        db.commit()
        db.refresh(sanctuary)
    
    # Calculate streaks
    streak_data = calculate_current_streak(daily_logs)
    
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "name": user.name,
            "companion": user.companion,
            "created_at": user.created_at.isoformat() if user.created_at else None
        },
        "sanctuary": {
            "id": sanctuary.id,
            "sky": sanctuary.sky,
            "river": sanctuary.river,
            "forest": sanctuary.forest,
            "weather": sanctuary.weather,
            "season": sanctuary.season,
            "animal": sanctuary.animal,
            "expression": sanctuary.expression,
            "crystal_level": sanctuary.crystal_level,
            "river_level": sanctuary.river_level,
            "forest_level": sanctuary.forest_level,
            "lantern_level": sanctuary.lantern_level,
            "day_count": sanctuary.day_count,
            "level": sanctuary.level,
            "xp": sanctuary.xp  # This will be 0 for new users
        },
        "daily_logs": format_daily_logs(daily_logs),
        "today_log": today_log_data,
        "museum": {
            "artifacts": [
                {
                    "id": artifact.id,
                    "artifact_name": artifact.artifact_name,
                    "description": artifact.description,
                    "lore": artifact.lore,
                    "unlocked": artifact.unlocked,
                    "unlock_date": artifact.unlock_date.isoformat() if artifact.unlock_date else None
                } for artifact in museum_artifacts
            ],
            "unlocked_count": len([a for a in museum_artifacts if a.unlocked]),
            "total_count": len(museum_artifacts)
        },
        "storybook": {
            "chapters": [
                {
                    "id": chapter.id,
                    "chapter_number": chapter.chapter_number,
                    "title": chapter.title,
                    "content": chapter.content,
                    "created_at": chapter.created_at.isoformat() if chapter.created_at else None
                } for chapter in storybook_chapters
            ],
            "total_chapters": len(storybook_chapters)
        },
        "chronicles": [
            {
                "id": chronicle.id,
                "week_number": chronicle.week_number,
                "chapter_title": chronicle.chapter_title,
                "title": chronicle.title,
                "content": chronicle.content,
                "created_at": chronicle.created_at.isoformat() if chronicle.created_at else None
            } for chronicle in chronicles
        ],
        "memories": [
            {
                "id": memory.id,
                "memory_type": memory.memory_type,
                "title": memory.title,
                "summary": memory.summary,
                "importance_score": memory.importance_score,
                "created_at": memory.created_at.isoformat() if memory.created_at else None
            } for memory in memories
        ],
        "progression": {
            **xp_data,
            "level": sanctuary.level,
            "next_level_xp": sanctuary.next_level_xp
        },
        "streaks": streak_data,
        "status": {
            "has_logged_today": today_log_data is not None,
            "total_days": len(format_daily_logs(daily_logs)),
            "sanctuary_initialized": True,
            "is_new_user": len(daily_logs) == 0 and len(museum_artifacts) == 0
        }
    }


def calculate_current_streak(logs: list) -> Dict:
    """Calculate current and longest streak from daily logs"""
    if not logs:
        return {"current_streak": 0, "longest_streak": 0}
    
    # Sort logs by created_at (newest first)
    sorted_logs = sorted(logs, key=lambda x: x.created_at, reverse=True)
    
    current_streak = len(sorted_logs)  # Simple count for now
    longest_streak = current_streak
    
    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak
    }


def format_daily_logs(logs: list) -> list:
    """Format daily logs from JSON structure"""
    formatted_logs = []
    
    for log in logs:
        try:
            entries = json.loads(log.daily_entries) if log.daily_entries else {}
            
            # Convert each date entry to individual log records
            for date_str, entry_data in entries.items():
                formatted_logs.append({
                    "id": log.id,
                    "date": date_str,
                    "sleep": entry_data.get("sleep", 0),
                    "water": entry_data.get("water", 0),
                    "exercise": entry_data.get("exercise", 0),
                    "nutrition": entry_data.get("nutrition", 0),
                    "mood": entry_data.get("mood", 0),
                    "created_at": log.created_at.isoformat() if log.created_at else None
                })
        except (json.JSONDecodeError, AttributeError):
            # Handle invalid JSON or missing data
            continue
    
    # Sort by date (newest first)
    formatted_logs.sort(key=lambda x: x["date"], reverse=True)
    return formatted_logs


def format_daily_log_entry(log) -> Dict:
    """Format a single daily log entry (today's log)"""
    if not log:
        return None
    
    try:
        entries = json.loads(log.daily_entries) if log.daily_entries else {}
        
        # Get the most recent entry
        if entries:
            latest_date = max(entries.keys())
            latest_entry = entries[latest_date]
            
            return {
                "id": log.id,
                "date": latest_date,
                "sleep": latest_entry.get("sleep", 0),
                "water": latest_entry.get("water", 0),
                "exercise": latest_entry.get("exercise", 0),
                "nutrition": latest_entry.get("nutrition", 0),
                "mood": latest_entry.get("mood", 0),
                "created_at": log.created_at.isoformat() if log.created_at else None
            }
    except (json.JSONDecodeError, AttributeError):
        pass
    
    return {
        "id": log.id,
        "date": date.today().isoformat(),
        "sleep": 0,
        "water": 0,
        "exercise": 0,
        "nutrition": 0,
        "mood": 0,
        "created_at": log.created_at.isoformat() if log.created_at else None
    }