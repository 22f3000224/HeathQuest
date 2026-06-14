from datetime import datetime, timedelta
from typing import Dict, List

from sqlalchemy.orm import Session

from core.models import ChronicleEntry, DailyLog, Memory, MuseumArtifact, SanctuaryState, StorybookChapter, User
from core.schemas import AIContext, UserResponse
from services.memory_service import calculate_current_streak


def build_ai_context(db: Session, user_id: int) -> AIContext:
    """Build comprehensive context for AI requests"""
    
    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found")
    
    # Get recent logs (last 30 days)
    thirty_days_ago = datetime.now().date() - timedelta(days=30)
    recent_logs = (
        db.query(DailyLog)
        .filter(DailyLog.user_id == user_id)
        .filter(DailyLog.date >= thirty_days_ago)
        .order_by(DailyLog.date.desc())
        .all()
    )
    
    # Get all logs for total count
    total_logs = db.query(DailyLog).filter(DailyLog.user_id == user_id).count()
    
    # Get important memories (score >= 4, last 10)
    memories = (
        db.query(Memory)
        .filter(Memory.user_id == user_id)
        .filter(Memory.importance_score >= 4)
        .order_by(Memory.created_at.desc())
        .limit(10)
        .all()
    )
    
    # Get unlocked artifacts
    artifacts = (
        db.query(MuseumArtifact)
        .filter(MuseumArtifact.user_id == user_id)
        .filter(MuseumArtifact.unlocked == True)
        .order_by(MuseumArtifact.unlock_date.desc())
        .all()
    )
    
    # Get recent chronicles (last 5)
    chronicles = (
        db.query(ChronicleEntry)
        .filter(ChronicleEntry.user_id == user_id)
        .order_by(ChronicleEntry.created_at.desc())
        .limit(5)
        .all()
    )
    
    # Get storybook chapters
    storybook_chapters = (
        db.query(StorybookChapter)
        .filter(StorybookChapter.user_id == user_id)
        .order_by(StorybookChapter.chapter_number.desc())
        .limit(5)
        .all()
    )
    
    # Get sanctuary state
    sanctuary_state = db.query(SanctuaryState).filter(SanctuaryState.user_id == user_id).first()
    
    # Calculate trends and milestones
    recent_trends = calculate_trends(recent_logs)
    milestones = calculate_milestones(recent_logs, total_logs, artifacts)
    
    return AIContext(
        user=UserResponse.model_validate(user),
        days_logged=total_logs,
        recent_logs=[log_to_dict(log) for log in recent_logs],
        memories=[memory_to_dict(memory) for memory in memories],
        artifacts=[artifact_to_dict(artifact) for artifact in artifacts],
        chronicles=[chronicle_to_dict(chronicle) for chronicle in chronicles],
        storybook_chapters=[chapter_to_dict(chapter) for chapter in storybook_chapters],
        sanctuary_state=sanctuary_to_dict(sanctuary_state) if sanctuary_state else {},
        recent_trends=recent_trends,
        milestones=milestones
    )


def log_to_dict(log: DailyLog) -> Dict:
    return {
        "date": log.date.isoformat(),
        "sleep": log.sleep,
        "water": log.water,
        "exercise": log.exercise,
        "nutrition": log.nutrition,
        "mood": log.mood
    }


def memory_to_dict(memory: Memory) -> Dict:
    return {
        "type": memory.memory_type,
        "title": memory.title,
        "summary": memory.summary,
        "importance": memory.importance_score,
        "date": memory.created_at.isoformat()
    }


def artifact_to_dict(artifact: MuseumArtifact) -> Dict:
    return {
        "name": artifact.artifact_name,
        "description": artifact.description,
        "lore": artifact.lore,
        "unlocked_date": artifact.unlock_date.isoformat() if artifact.unlock_date else None
    }


def chronicle_to_dict(chronicle: ChronicleEntry) -> Dict:
    return {
        "title": chronicle.title,
        "content": chronicle.content[:200] + "..." if len(chronicle.content) > 200 else chronicle.content,
        "date": chronicle.created_at.isoformat()
    }


def chapter_to_dict(chapter: StorybookChapter) -> Dict:
    return {
        "number": chapter.chapter_number,
        "title": chapter.title,
        "content": chapter.content[:200] + "..." if len(chapter.content) > 200 else chapter.content,
        "date": chapter.created_at.isoformat()
    }


def sanctuary_to_dict(sanctuary: SanctuaryState) -> Dict:
    return {
        "sky": sanctuary.sky,
        "river": sanctuary.river,
        "forest": sanctuary.forest,
        "weather": sanctuary.weather,
        "season": sanctuary.season,
        "animal": sanctuary.animal,
        "expression": sanctuary.expression,
        "level": sanctuary.level,
        "xp": sanctuary.xp,
        "day_count": sanctuary.day_count
    }


def calculate_trends(recent_logs: List[DailyLog]) -> Dict:
    """Calculate recent trends in health metrics"""
    if len(recent_logs) < 7:
        return {}
    
    # Get last 7 days vs previous 7 days
    last_7 = recent_logs[:7]
    prev_7 = recent_logs[7:14] if len(recent_logs) >= 14 else []
    
    trends = {}
    
    if prev_7:
        # Sleep trend
        last_sleep = sum(log.sleep for log in last_7) / len(last_7)
        prev_sleep = sum(log.sleep for log in prev_7) / len(prev_7)
        trends["sleep_change"] = last_sleep - prev_sleep
        
        # Water trend
        last_water = sum(log.water for log in last_7) / len(last_7)
        prev_water = sum(log.water for log in prev_7) / len(prev_7)
        trends["water_change"] = last_water - prev_water
        
        # Mood trend
        last_mood = sum(log.mood for log in last_7) / len(last_7)
        prev_mood = sum(log.mood for log in prev_7) / len(prev_7)
        trends["mood_change"] = last_mood - prev_mood
    
    # Current streak
    trends["current_streak"] = calculate_current_streak(recent_logs)
    
    return trends


def calculate_milestones(recent_logs: List[DailyLog], total_logs: int, artifacts: List[MuseumArtifact]) -> List[Dict]:
    """Calculate current milestones and achievements"""
    milestones = []
    
    current_streak = calculate_current_streak(recent_logs)
    
    # Streak milestones
    if current_streak >= 7:
        milestones.append({
            "type": "streak",
            "title": f"{current_streak}-day streak",
            "description": f"Currently maintaining a {current_streak}-day logging streak"
        })
    
    # Total logs milestone
    if total_logs >= 30:
        milestones.append({
            "type": "dedication",
            "title": f"{total_logs} days logged",
            "description": f"Has recorded {total_logs} days in the sanctuary"
        })
    
    # Artifact count
    if artifacts:
        milestones.append({
            "type": "collection",
            "title": f"{len(artifacts)} artifacts unlocked",
            "description": f"Has unlocked {len(artifacts)} precious artifacts"
        })
    
    return milestones