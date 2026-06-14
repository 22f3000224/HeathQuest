"""
Progression API Router - Endpoints for progression systems
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from core.database import get_db
from core.models import User
from services.progression_engine import get_user_progression_status
from services.chronicle_generator import get_user_chronicles
from services.storybook_evolution import get_user_storybook
from services.memory_integration import get_ai_companion_memories

router = APIRouter(prefix="/api/progression", tags=["progression"])


@router.get("/{user_id}/status")
def get_progression_status(user_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get comprehensive progression status for user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return get_user_progression_status(db, user_id)


@router.get("/{user_id}/chronicles")
def get_chronicles(user_id: int, limit: int = 20, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get chronicle entries for user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    entries = get_user_chronicles(db, user_id, limit)
    
    return {
        "user_id": user_id,
        "entries": entries,
        "count": len(entries)
    }


@router.get("/{user_id}/storybook")
def get_storybook(user_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get storybook state for user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    storybook_state = get_user_storybook(db, user_id)
    
    return {
        "user_id": user_id,
        **storybook_state
    }


@router.get("/{user_id}/storybook/{book_id}")
def get_storybook_book(user_id: int, book_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get specific storybook book with chapters"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    storybook_state = get_user_storybook(db, user_id)
    
    # Find the requested book
    book_data = None
    for book in storybook_state["books"]:
        if book["id"] == book_id:
            book_data = book
            break
    
    if not book_data:
        raise HTTPException(status_code=404, detail="Book not found")
    
    return {
        "user_id": user_id,
        "book": book_data
    }


@router.get("/{user_id}/memories")
def get_memories(user_id: int, context_type: str = "general", db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get memories for AI companion consumption"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    memories = get_ai_companion_memories(db, user_id, context_type)
    
    return {
        "user_id": user_id,
        "context_type": context_type,
        "memories": memories,
        "count": len(memories)
    }


@router.get("/{user_id}/artifacts/detailed")
def get_detailed_artifacts(user_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get detailed artifact information with unlock history"""
    from services.museum_curator import get_museum_artifacts
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    museum_state = get_museum_artifacts(db, user_id)
    
    # Add progress information
    unlocked_artifacts = [a for a in museum_state["artifacts"] if a["unlocked"]]
    locked_artifacts = [a for a in museum_state["artifacts"] if not a["unlocked"]]
    
    # Calculate completion percentage
    completion_percentage = (museum_state["unlocked_count"] / museum_state["total_count"]) * 100
    
    return {
        "user_id": user_id,
        "summary": {
            "total_count": museum_state["total_count"],
            "unlocked_count": museum_state["unlocked_count"],
            "locked_count": len(locked_artifacts),
            "completion_percentage": round(completion_percentage, 1)
        },
        "unlocked": unlocked_artifacts,
        "locked": locked_artifacts,
        "next_unlock_hints": _get_unlock_hints(locked_artifacts)
    }


def _get_unlock_hints(locked_artifacts: List[Dict]) -> List[Dict]:
    """Get hints for unlocking remaining artifacts"""
    hints = {
        "dream_shard": "Maintain average sleep of 7+ hours for 7 logged days",
        "aqua_prism": "Reach hydration goal (6+ glasses) for 5 consecutive days", 
        "harvest_basket": "Achieve nutrition target (7+ score) for 10 consecutive days",
        "solar_orb": "Maintain exercise streak (6+ score) for 10 days",
        "spirit_deer": "Keep positive mood trend (7+ average) for 14 logged days",
        "ancient_grove": "Complete 30 total Daily Logs",
        "gold_star": "Unlock all other artifacts OR achieve 100-day streak"
    }
    
    unlock_hints = []
    for artifact in locked_artifacts[:3]:  # Show hints for next 3 artifacts
        artifact_id = artifact["id"]
        hint = hints.get(artifact_id, "Continue your daily logging practice")
        
        unlock_hints.append({
            "artifact_id": artifact_id,
            "artifact_name": artifact["display_name"],
            "hint": hint,
            "category": artifact["category"]
        })
    
    return unlock_hints


@router.get("/{user_id}/streaks")
def get_streak_info(user_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get detailed streak information"""
    from services.progression_engine import ProgressionEngine
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    engine = ProgressionEngine(db)
    current_streak = engine._calculate_current_streak(user_id)
    total_logs = engine._get_total_logs_count(user_id)
    next_milestone = engine._get_next_streak_milestone(current_streak)
    
    # Calculate streak milestones achieved
    milestones = [7, 14, 21, 30, 50, 100]
    achieved_milestones = [m for m in milestones if current_streak >= m]
    
    return {
        "user_id": user_id,
        "current_streak": current_streak,
        "total_logs": total_logs,
        "next_milestone": next_milestone,
        "days_to_milestone": (next_milestone - current_streak) if next_milestone else None,
        "achieved_milestones": achieved_milestones,
        "milestone_progress": {
            "7_day": current_streak >= 7,
            "14_day": current_streak >= 14, 
            "21_day": current_streak >= 21,
            "30_day": current_streak >= 30,
            "50_day": current_streak >= 50,
            "100_day": current_streak >= 100
        }
    }