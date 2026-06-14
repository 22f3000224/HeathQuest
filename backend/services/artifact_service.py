"""
Artifact Service - manages user artifacts and unlock conditions
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from core.models import MuseumArtifact
from datetime import datetime, timedelta

def get_user_artifacts(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """Get all artifacts for a user"""
    artifacts = db.query(MuseumArtifact).filter(MuseumArtifact.user_id == user_id).all()
    
    result = []
    for artifact in artifacts:
        result.append({
            "name": artifact.artifact_name,
            "description": artifact.description,
            "lore": artifact.lore,
            "is_unlocked": artifact.unlocked,
            "unlock_date": artifact.unlock_date.isoformat() if artifact.unlock_date else None,
            "unlock_progress": 100 if artifact.unlocked else _calculate_unlock_progress(artifact.artifact_name, db, user_id)
        })
    
    return result

def get_artifact_details(db: Session, artifact_name: str, user_id: int = None) -> Optional[Dict[str, Any]]:
    """Get details for a specific artifact"""
    # First try to get from user's artifacts if user_id provided
    if user_id:
        user_artifact = db.query(MuseumArtifact).filter(
            MuseumArtifact.user_id == user_id,
            MuseumArtifact.artifact_name.ilike(f"%{artifact_name}%")
        ).first()
        
        if user_artifact:
            return {
                "name": user_artifact.artifact_name,
                "description": user_artifact.description,
                "lore": user_artifact.lore,
                "is_unlocked": user_artifact.unlocked,
                "unlock_condition": _get_unlock_condition(user_artifact.artifact_name),
                "unlock_progress": 100 if user_artifact.unlocked else _calculate_unlock_progress(user_artifact.artifact_name, db, user_id)
            }
    
    # Fallback to predefined artifact definitions
    artifact_definitions = {
        "dream shard": {
            "name": "Dream Shard",
            "description": "A crystal that represents restful sleep within the sanctuary",
            "unlock_condition": "maintain your sleep goal for 7 logged days",
            "lore": "This ethereal crystal forms when consistent rest nurtures the mind and body."
        },
        "aqua prism": {
            "name": "Aqua Prism",
            "description": "A flowing crystal that represents proper hydration", 
            "unlock_condition": "log 8+ glasses of water for 5 consecutive days",
            "lore": "Born from the sanctuary's flowing waters, this prism reflects your commitment to nourishment."
        },
        "vitality crystal": {
            "name": "Vitality Crystal",
            "description": "A pulsing gem that represents physical activity",
            "unlock_condition": "complete moderate or intense exercise for 10 days", 
            "lore": "This crystal pulses with the energy of movement and strength."
        },
        "mood gem": {
            "name": "Mood Gem",
            "description": "A shifting stone that represents emotional balance",
            "unlock_condition": "maintain mood rating above 7 for 14 days",
            "lore": "This gem shifts colors with the tides of emotion, celebrating inner peace."
        }
    }
    
    artifact_key = artifact_name.lower().strip()
    if artifact_key in artifact_definitions:
        artifact_def = artifact_definitions[artifact_key]
        return {
            "name": artifact_def["name"],
            "description": artifact_def["description"],
            "unlock_condition": artifact_def["unlock_condition"],
            "lore": artifact_def["lore"],
            "is_unlocked": False,
            "unlock_progress": 0
        }
    
    return None

def get_recent_artifact_unlocks(db: Session, user_id: int, days: int = 7) -> List[Dict[str, Any]]:
    """Get recently unlocked artifacts"""
    cutoff_date = datetime.now() - timedelta(days=days)
    
    recent_unlocks = db.query(MuseumArtifact).filter(
        MuseumArtifact.user_id == user_id,
        MuseumArtifact.unlocked == True,
        MuseumArtifact.unlock_date >= cutoff_date
    ).order_by(MuseumArtifact.unlock_date.desc()).all()
    
    result = []
    for artifact in recent_unlocks:
        result.append({
            "name": artifact.artifact_name,
            "description": artifact.description,
            "unlock_date": artifact.unlock_date.isoformat() if artifact.unlock_date else None
        })
    
    return result

def _get_unlock_condition(artifact_name: str) -> str:
    """Get unlock condition for an artifact"""
    conditions = {
        "Dream Shard": "maintain sleep goal for 7 consecutive days",
        "Aqua Prism": "log 8+ glasses of water for 5 consecutive days", 
        "Vitality Crystal": "complete moderate or intense exercise for 10 days",
        "Mood Gem": "maintain mood rating above 7 for 14 days",
        "Consistency Crown": "log daily entries for 30 consecutive days",
        "Balance Stone": "achieve all health targets for 7 days"
    }
    
    return conditions.get(artifact_name, "complete specific health goals")

def _calculate_unlock_progress(artifact_name: str, db: Session, user_id: int) -> int:
    """Calculate unlock progress for an artifact based on recent logs"""
    # This would need to analyze user's recent daily logs
    # For now, return a placeholder progress
    
    # Import here to avoid circular imports
    import json
    from core.models import DailyLog
    
    # Get recent logs
    recent_logs = db.query(DailyLog).filter(
        DailyLog.user_id == user_id
    ).order_by(DailyLog.created_at.desc()).limit(14).all()
    
    if not recent_logs:
        return 0
    
    progress = 0
    
    try:
        if "Dream Shard" in artifact_name:
            # Count days with adequate sleep (7+ hours)
            sleep_days = 0
            for log in recent_logs:
                try:
                    daily_data = json.loads(log.daily_entries)
                    if daily_data.get("sleep", 0) >= 7:
                        sleep_days += 1
                except:
                    continue
            progress = min(int((sleep_days / 7) * 100), 100)
            
        elif "Aqua Prism" in artifact_name:
            # Count days with adequate water (8+ glasses)
            water_days = 0
            for log in recent_logs:
                try:
                    daily_data = json.loads(log.daily_entries)
                    if daily_data.get("water", 0) >= 8:
                        water_days += 1
                except:
                    continue
            progress = min(int((water_days / 5) * 100), 100)
            
        elif "Vitality Crystal" in artifact_name:
            # Count days with moderate+ exercise
            exercise_days = 0
            for log in recent_logs:
                try:
                    daily_data = json.loads(log.daily_entries)
                    exercise = daily_data.get("exercise", "none")
                    if exercise in ["moderate", "intense"]:
                        exercise_days += 1
                except:
                    continue
            progress = min(int((exercise_days / 10) * 100), 100)
            
        elif "Mood Gem" in artifact_name:
            # Count days with good mood (7+)
            mood_days = 0
            for log in recent_logs:
                try:
                    daily_data = json.loads(log.daily_entries)
                    if daily_data.get("mood", 0) >= 7:
                        mood_days += 1
                except:
                    continue
            progress = min(int((mood_days / 14) * 100), 100)
            
    except Exception:
        progress = 0
    
    return progress