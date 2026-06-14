from datetime import date, timedelta
from typing import Dict, List
import json
from sqlalchemy.orm import Session
from core.models import DailyLog, SanctuaryState, MuseumArtifact, StorybookChapter


def calculate_user_xp(db: Session, user_id: int) -> Dict:
    """
    Calculate total XP from all sources for a user.
    Returns breakdown of XP sources.
    """
    # Get all daily logs
    logs = db.query(DailyLog).filter(DailyLog.user_id == user_id).all()
    
    # Calculate daily log XP
    daily_log_xp = 0
    for log in logs:
        daily_log_xp += calculate_log_xp(log_to_dict(log))
    
    # Calculate streak XP
    streak_xp = calculate_streak_xp(logs)
    
    # Calculate museum XP
    artifacts = db.query(MuseumArtifact).filter(
        MuseumArtifact.user_id == user_id,
        MuseumArtifact.unlocked == True
    ).all()
    museum_xp = len(artifacts) * 50  # 50 XP per artifact
    
    # Calculate storybook XP
    chapters = db.query(StorybookChapter).filter(StorybookChapter.user_id == user_id).all()
    story_xp = len(chapters) * 25  # 25 XP per chapter
    
    total_xp = daily_log_xp + streak_xp + museum_xp + story_xp
    
    return {
        "total_xp": total_xp,
        "daily_log_xp": daily_log_xp,
        "streak_xp": streak_xp,
        "museum_xp": museum_xp,
        "story_xp": story_xp,
        "breakdown": {
            "logs_count": len(logs),
            "artifacts_count": len(artifacts),
            "chapters_count": len(chapters)
        }
    }


def calculate_log_xp(log_dict: Dict) -> int:
    """Calculate XP awarded for a single daily log"""
    xp = 0
    if log_dict.get("sleep", 0) >= 7:
        xp += 20
    if log_dict.get("water", 0) >= 6:
        xp += 20
    if log_dict.get("exercise", "none") in ("moderate", "intense"):
        xp += 20
    if log_dict.get("nutrition", "poor") in ("good", "great"):
        xp += 20
    if log_dict.get("mood", 0) >= 3:
        xp += 10
    return xp


def calculate_streak_xp(logs: List[DailyLog]) -> int:
    """Calculate bonus XP from consecutive day streaks"""
    if not logs:
        return 0
    
    # Get all daily entries from JSON structure
    all_entries = []
    for log in logs:
        try:
            entries = json.loads(log.daily_entries) if log.daily_entries else {}
            for date_str, entry_data in entries.items():
                all_entries.append((date_str, entry_data))
        except (json.JSONDecodeError, AttributeError):
            continue
    
    if not all_entries:
        return 0
    
    # Sort by date
    sorted_entries = sorted(all_entries, key=lambda x: x[0])
    
    current_streak = 1
    max_streak = 1
    
    for i in range(1, len(sorted_entries)):
        prev_date_str = sorted_entries[i-1][0]
        curr_date_str = sorted_entries[i][0]
        
        try:
            prev_date = date.fromisoformat(prev_date_str)
            curr_date = date.fromisoformat(curr_date_str)
            
            if curr_date == prev_date + timedelta(days=1):
                current_streak += 1
                max_streak = max(max_streak, current_streak)
            else:
                current_streak = 1
        except ValueError:
            current_streak = 1
    
    # Award bonus XP for streaks
    streak_xp = 0
    if max_streak >= 7:
        streak_xp += (max_streak // 7) * 100  # 100 XP per week
    if max_streak >= 30:
        streak_xp += (max_streak // 30) * 500  # 500 XP per month
    
    return streak_xp


def log_to_dict(log: DailyLog) -> Dict:
    """Convert DailyLog to dict for XP calculation"""
    # Handle JSON structure - get the most recent entry
    try:
        entries = json.loads(log.daily_entries) if log.daily_entries else {}
        if entries:
            # Get the most recent entry
            latest_date = max(entries.keys())
            latest_entry = entries[latest_date]
            return {
                "sleep": latest_entry.get("sleep", 0),
                "water": latest_entry.get("water", 0),
                "exercise": latest_entry.get("exercise", 0),
                "nutrition": latest_entry.get("nutrition", 0),
                "mood": latest_entry.get("mood", 0)
            }
    except (json.JSONDecodeError, AttributeError, ValueError):
        pass
    
    # Return default values if no data
    return {
        "sleep": 0,
        "water": 0,
        "exercise": 0,
        "nutrition": 0,
        "mood": 0
    }


def recalculate_sanctuary_xp(db: Session, user_id: int) -> SanctuaryState:
    """Recalculate and update sanctuary XP from scratch"""
    xp_data = calculate_user_xp(db, user_id)
    
    sanctuary = db.query(SanctuaryState).filter(SanctuaryState.user_id == user_id).first()
    if not sanctuary:
        sanctuary = SanctuaryState(user_id=user_id)
        db.add(sanctuary)
    
    sanctuary.xp = xp_data["total_xp"]
    sanctuary.level = calculate_level(sanctuary.xp)
    sanctuary.next_level_xp = calculate_next_level_xp(sanctuary.level)
    
    db.flush()
    return sanctuary


def calculate_level(xp: int) -> int:
    """Calculate level from total XP"""
    return min(10, (xp // 100) + 1)


def calculate_next_level_xp(level: int) -> int:
    """Calculate XP needed for next level"""
    return level * 100