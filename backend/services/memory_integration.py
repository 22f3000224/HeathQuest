"""
Memory Integration Service - Store progression events for AI companion consumption
"""
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from core.models import User, Memory
from sqlalchemy.orm import Session
import json

class MemoryIntegration:
    """Store important progression events as memories"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def ensure_memory_record(self, user_id: int) -> Memory:
        """Ensure user has a memory record"""
        # No single JSON-backed memory record in current schema.
        # Keep for compatibility but simply return None — callers should
        # use add_memory() to create Memory rows.
        return None
    
    def add_memory(self, user_id: int, memory_type: str, title: str, summary: str, 
                   importance_score: int, metadata: Optional[Dict] = None) -> bool:
        """Add a new memory"""
        mem = Memory(
            user_id=user_id,
            memory_type=memory_type,
            title=title,
            summary=summary,
            importance_score=float(importance_score)
        )
        self.db.add(mem)
        self.db.flush()
        return True
    
    def record_artifact_unlock(self, user_id: int, artifact_key: str, artifact_name: str) -> bool:
        """Record artifact unlock as memory"""
        importance_scores = {
            "leaf_chronicle": 8,    # Starting milestone
            "dream_shard": 7,       # Good achievement
            "aqua_prism": 7,        # Good achievement  
            "harvest_basket": 8,    # Significant milestone
            "solar_orb": 8,         # Significant milestone
            "spirit_deer": 9,       # Major achievement
            "ancient_grove": 9,     # Major achievement
            "gold_star": 10         # Legendary achievement
        }
        
        summaries = {
            "leaf_chronicle": "Journey begins in the mystical sanctuary with the first artifact unlocked",
            "dream_shard": "Achieved consistent sleep quality, crystallizing peaceful rest into permanent power",
            "aqua_prism": "Mastered hydration goals, creating a prism of pure intention and flow",
            "harvest_basket": "Sustained nutritious eating patterns, weaving abundance and mindful nourishment",
            "solar_orb": "Maintained exercise discipline, capturing solar energy through consistent movement",
            "spirit_deer": "Achieved emotional balance, attracting the sacred deer through inner harmony",
            "ancient_grove": "Reached 30-day consistency milestone, growing deep roots of lasting habit",
            "gold_star": "Unlocked the ultimate achievement - legendary dedication and sanctuary mastery"
        }
        
        return self.add_memory(
            user_id=user_id,
            memory_type="artifact_unlock",
            title=f"{artifact_name} Unlocked",
            summary=summaries.get(artifact_key, f"Unlocked the {artifact_name} through dedication"),
            importance_score=importance_scores.get(artifact_key, 7),
            metadata={"artifact_key": artifact_key, "artifact_name": artifact_name}
        )
    
    def record_streak_milestone(self, user_id: int, streak_days: int) -> bool:
        """Record streak milestone as memory"""
        importance_map = {
            7: 7,    # First week
            14: 8,   # Two weeks
            21: 8,   # Habit formation
            30: 9,   # One month
            50: 9,   # Halfway to 100
            100: 10  # Legendary streak
        }
        
        summaries = {
            7: "Completed first week of consistent daily logging - transformation begins",
            14: "Reached two-week milestone - neural pathways strengthening through repetition",
            21: "Achieved 21-day habit formation threshold - consistency becoming natural",
            30: "Completed full month of dedication - foundation solidly established",
            50: "Reached 50-day halfway point - unwavering focus demonstrated",
            100: "Achieved legendary 100-day consistency - identity-level transformation complete"
        }
        
        if streak_days in importance_map:
            return self.add_memory(
                user_id=user_id,
                memory_type="streak_milestone",
                title=f"{streak_days}-Day Streak",
                summary=summaries[streak_days],
                importance_score=importance_map[streak_days],
                metadata={"streak_days": streak_days}
            )
        
        return False
    
    def record_sanctuary_evolution(self, user_id: int, old_level: int, new_level: int) -> bool:
        """Record sanctuary level increase as memory"""
        return self.add_memory(
            user_id=user_id,
            memory_type="sanctuary_evolution",
            title=f"Sanctuary Level {new_level}",
            summary=f"Sanctuary evolved from level {old_level} to {new_level} - unlocking new potential and capabilities",
            importance_score=min(9, 6 + new_level),  # Cap at 9, start at 7 for level 1
            metadata={"old_level": old_level, "new_level": new_level}
        )
    
    def record_storybook_milestone(self, user_id: int, book_name: str, chapter_count: int) -> bool:
        """Record storybook milestone as memory"""
        importance_scores = {
            "The Awakening": 8,
            "Restoration": 8, 
            "Growth": 9,
            "Legacy": 10
        }
        
        return self.add_memory(
            user_id=user_id,
            memory_type="storybook_milestone",
            title=f"{book_name} Complete",
            summary=f"Completed {book_name} with {chapter_count} chapters - milestone-driven narrative achievement",
            importance_score=importance_scores.get(book_name, 7),
            metadata={"book": book_name, "chapters": chapter_count}
        )
    
    def record_personal_achievement(self, user_id: int, achievement_type: str, description: str, 
                                  importance_score: int = 7) -> bool:
        """Record personal achievement as memory"""
        return self.add_memory(
            user_id=user_id,
            memory_type="personal_achievement",
            title=achievement_type,
            summary=description,
            importance_score=importance_score
        )
    
    def get_memories_for_ai(self, user_id: int, min_importance: int = 7, limit: int = 20) -> List[Dict]:
        """Get high-importance memories for AI companion consumption"""
        # Query Memory rows filtered by importance
        rows = self.db.query(Memory).filter(
            Memory.user_id == user_id,
            Memory.importance_score >= float(min_importance)
        ).order_by(Memory.created_at.desc()).limit(limit).all()

        result = []
        for r in rows:
            result.append({
                "memory_type": r.memory_type,
                "title": r.title,
                "summary": r.summary,
                "importance_score": r.importance_score,
                "created_at": r.created_at.isoformat()
            })

        return result
    
    def get_memories_by_type(self, user_id: int, memory_type: str) -> List[Dict]:
        """Get memories of specific type"""
        rows = self.db.query(Memory).filter(
            Memory.user_id == user_id,
            Memory.memory_type == memory_type
        ).order_by(Memory.created_at.desc()).all()

        return [
            {
                "memory_type": r.memory_type,
                "title": r.title,
                "summary": r.summary,
                "importance_score": r.importance_score,
                "created_at": r.created_at.isoformat()
            }
            for r in rows
        ]
    
    def get_memory_summary(self, user_id: int) -> Dict:
        """Get memory summary for user"""
        rows = self.db.query(Memory).filter(Memory.user_id == user_id).order_by(Memory.created_at.asc()).all()

        type_counts = {}
        importance_distribution = {8: 0, 9: 0, 10: 0}

        for r in rows:
            type_counts[r.memory_type] = type_counts.get(r.memory_type, 0) + 1
            if r.importance_score >= 8:
                importance_distribution[int(r.importance_score)] = importance_distribution.get(int(r.importance_score), 0) + 1

        return {
            "total_memories": len(rows),
            "by_type": type_counts,
            "high_importance_count": sum(importance_distribution.values()),
            "importance_distribution": importance_distribution,
            "most_recent": {
                "memory_type": rows[-1].memory_type,
                "title": rows[-1].title,
                "summary": rows[-1].summary,
                "importance_score": rows[-1].importance_score,
                "created_at": rows[-1].created_at.isoformat()
            } if rows else None
        }


def record_progression_memories(db: Session, user_id: int, progression_events: Dict) -> List[str]:
    """Record memories for all progression events"""
    integration = MemoryIntegration(db)
    recorded_memories = []
    
    # Record artifact unlock memories
    if progression_events.get("new_unlocks"):
        for artifact_key in progression_events["new_unlocks"]:
            from services.museum_curator import ARTIFACT_DEFINITIONS
            artifact_name = ARTIFACT_DEFINITIONS[artifact_key]["display_name"]
            
            success = integration.record_artifact_unlock(user_id, artifact_key, artifact_name)
            if success:
                recorded_memories.append(f"artifact_{artifact_key}")
    
    # Record streak milestone memories
    if progression_events.get("streak_milestone"):
        streak_days = progression_events["streak_milestone"]
        success = integration.record_streak_milestone(user_id, streak_days)
        if success:
            recorded_memories.append(f"streak_{streak_days}")
    
    # Record sanctuary evolution memories
    if progression_events.get("sanctuary_evolution"):
        old_level = progression_events["sanctuary_evolution"]["old_level"]
        new_level = progression_events["sanctuary_evolution"]["new_level"]
        success = integration.record_sanctuary_evolution(user_id, old_level, new_level)
        if success:
            recorded_memories.append(f"sanctuary_level_{new_level}")
    
    # Record storybook milestone memories
    if progression_events.get("storybook_milestone"):
        book_name = progression_events["storybook_milestone"]["book"]
        chapter_count = progression_events["storybook_milestone"]["chapters"]
        success = integration.record_storybook_milestone(user_id, book_name, chapter_count)
        if success:
            recorded_memories.append(f"storybook_{book_name}")
    
    return recorded_memories


def get_ai_companion_memories(db: Session, user_id: int, context_type: str = "general") -> List[Dict]:
    """Get memories formatted for AI companion consumption"""
    integration = MemoryIntegration(db)
    
    if context_type == "artifacts":
        return integration.get_memories_by_type(user_id, "artifact_unlock")
    elif context_type == "streaks":
        return integration.get_memories_by_type(user_id, "streak_milestone") 
    elif context_type == "sanctuary":
        return integration.get_memories_by_type(user_id, "sanctuary_evolution")
    elif context_type == "storybook":
        return integration.get_memories_by_type(user_id, "storybook_milestone")
    else:
        return integration.get_memories_for_ai(user_id)