from datetime import datetime, timedelta
from typing import List

from sqlalchemy import func
from sqlalchemy.orm import Session

from core.models import DailyLog, Memory, User
from core.schemas import MemoryCreate


def create_memory(db: Session, memory_data: MemoryCreate) -> Memory:
    memory = Memory(**memory_data.model_dump())
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory


def get_user_memories(db: Session, user_id: int, limit: int = 10) -> List[Memory]:
    return (
        db.query(Memory)
        .filter(Memory.user_id == user_id)
        .filter(Memory.importance_score >= 4)  # Only important memories
        .order_by(Memory.created_at.desc())
        .limit(limit)
        .all()
    )


def check_and_create_memories(db: Session, user_id: int, log_data: dict, sanctuary_state: dict):
    """Check for memory-worthy events and create them"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return
    
    memories_to_create = []
    
    # Check for first login memory
    if not db.query(Memory).filter(Memory.user_id == user_id, Memory.memory_type == "milestone").first():
        memories_to_create.append({
            "memory_type": "milestone",
            "title": "First Footsteps",
            "summary": f"{user.name} entered the sanctuary for the first time with their {user.companion} companion.",
            "importance_score": 8
        })
    
    # Get log count and streaks
    log_count = db.query(DailyLog).filter(DailyLog.user_id == user_id).count()
    
    # First log memory
    if log_count == 1:
        memories_to_create.append({
            "memory_type": "milestone",
            "title": "First Health Log",
            "summary": f"The journey begins - {user.name} recorded their first day in the sanctuary.",
            "importance_score": 7
        })
    
    # Calculate current streak
    recent_logs = (
        db.query(DailyLog)
        .filter(DailyLog.user_id == user_id)
        .order_by(DailyLog.date.desc())
        .limit(30)
        .all()
    )
    
    current_streak = calculate_current_streak(recent_logs)
    
    # Streak milestones
    if current_streak == 7 and not _memory_exists(db, user_id, "First Week Complete"):
        memories_to_create.append({
            "memory_type": "milestone",
            "title": "First Week Complete",
            "summary": f"Seven days of dedication - the sanctuary recognizes {user.name}'s commitment.",
            "importance_score": 8
        })
    
    if current_streak == 14 and not _memory_exists(db, user_id, "Fortnight of Growth"):
        memories_to_create.append({
            "memory_type": "milestone",
            "title": "Fortnight of Growth",
            "summary": f"Two weeks of nurturing - the sanctuary's roots grow deeper.",
            "importance_score": 9
        })
    
    if current_streak == 30 and not _memory_exists(db, user_id, "Month of Devotion"):
        memories_to_create.append({
            "memory_type": "milestone",
            "title": "Month of Devotion",
            "summary": f"Thirty days of care - {user.name} has truly become one with the sanctuary.",
            "importance_score": 10
        })
    
    # Sanctuary state improvements
    if log_count >= 3:
        _check_improvement_memories(db, user_id, recent_logs, memories_to_create)
    
    # Create all memories
    for memory_data in memories_to_create:
        memory = MemoryCreate(user_id=user_id, **memory_data)
        create_memory(db, memory)


def _memory_exists(db: Session, user_id: int, title: str) -> bool:
    return db.query(Memory).filter(Memory.user_id == user_id, Memory.title == title).first() is not None


def _check_improvement_memories(db: Session, user_id: int, recent_logs: List[DailyLog], memories_to_create: list):
    """Check for significant improvements in health metrics"""
    if len(recent_logs) < 7:
        return
    
    # Compare last 3 days vs previous 4 days
    recent_3 = recent_logs[:3]
    previous_4 = recent_logs[3:7]
    
    recent_sleep = sum(log.sleep for log in recent_3) / len(recent_3)
    previous_sleep = sum(log.sleep for log in previous_4) / len(previous_4)
    
    recent_water = sum(log.water for log in recent_3) / len(recent_3)
    previous_water = sum(log.water for log in previous_4) / len(previous_4)
    
    # Sleep improvement
    if recent_sleep >= previous_sleep + 2 and not _memory_exists(db, user_id, "Sleep Sanctuary Restored"):
        memories_to_create.append({
            "memory_type": "sanctuary",
            "title": "Sleep Sanctuary Restored",
            "summary": f"The night sky clears as rest returns - sleep improved from {previous_sleep:.1f} to {recent_sleep:.1f} hours.",
            "importance_score": 7
        })
    
    # Hydration improvement
    if recent_water >= previous_water + 3 and not _memory_exists(db, user_id, "River Flows Again"):
        memories_to_create.append({
            "memory_type": "sanctuary",
            "title": "River Flows Again",
            "summary": f"Waters surge through the sanctuary - hydration improved from {previous_water:.1f} to {recent_water:.1f} glasses.",
            "importance_score": 7
        })


def calculate_current_streak(logs: List[DailyLog]) -> int:
    """Calculate current consecutive logging streak"""
    if not logs:
        return 0
    
    # Sort by date descending
    sorted_logs = sorted(logs, key=lambda x: x.date, reverse=True)
    
    streak = 0
    expected_date = datetime.now().date()
    
    for log in sorted_logs:
        if log.date == expected_date:
            streak += 1
            expected_date = expected_date - timedelta(days=1)
        else:
            break
    
    return streak


def get_recent_memories(db: Session, user_id: int, days: int = 7) -> List[Memory]:
    """Get memories from the last N days"""
    cutoff_date = datetime.now() - timedelta(days=days)
    return (
        db.query(Memory)
        .filter(Memory.user_id == user_id)
        .filter(Memory.created_at >= cutoff_date)
        .order_by(Memory.created_at.desc())
        .all()
    )