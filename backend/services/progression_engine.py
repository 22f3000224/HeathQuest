"""
Progression Engine - Main orchestrator for all progression systems
"""
import json
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from core.models import User, DailyLog, SanctuaryState
from services.museum_curator import evaluate_progression as evaluate_artifacts
from services.chronicle_generator import generate_progression_chronicles
from services.storybook_evolution import generate_storybook_progression
from services.memory_integration import record_progression_memories
from services.xp_calculator import recalculate_sanctuary_xp
from services.master_health_agent import get_master_health_analysis
from services.storybook_agent import generate_story_chapter

class ProgressionEngine:
    """Main progression engine orchestrating all systems"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def process_daily_log_progression(self, user_id: int, log_data: Dict) -> Dict[str, Any]:
        """Process all progression systems after daily log submission"""
        
        # 1. Evaluate artifact conditions
        artifact_results = evaluate_artifacts(self.db, user_id)
        
        # 2. Calculate current streak
        current_streak = self._calculate_current_streak(user_id)
        
        # 3. Get total logs count
        total_logs = self._get_total_logs_count(user_id)
        
        # 4. Check for sanctuary level changes
        sanctuary_changes = self._check_sanctuary_evolution(user_id)
        
        # 5. Recalculate XP and award progression XP
        xp_changes = self._process_xp_awards(user_id, artifact_results)
        
        # Compile all progression data
        progression_data = {
            "new_unlocks": artifact_results.get("new_unlocks", []),
            "total_unlocked": artifact_results.get("total_unlocked", 0),
            "current_streak": current_streak,
            "total_logs": total_logs,
            "xp_awarded": xp_changes.get("progression_xp", 0)
        }
        
        # Add milestone flags
        if current_streak in [7, 14, 21, 30, 50, 100]:
            progression_data["streak_milestone"] = current_streak
        
        if sanctuary_changes:
            progression_data["sanctuary_evolution"] = sanctuary_changes
        
        # 6. Generate chronicle entries
        chronicle_results = generate_progression_chronicles(self.db, user_id, progression_data)
        
        # 7. Generate storybook progression  
        storybook_results = generate_storybook_progression(
            self.db, user_id, "daily_log", log_data, progression_data
        )
        
        # 8. Record memories
        memory_results = record_progression_memories(self.db, user_id, progression_data)
        
        # 9. Trigger Agent Layer Updates
        self._trigger_agent_updates(user_id, progression_data)
        
        # Return comprehensive progression summary
        return {
            "artifacts": {
                "new_unlocks": progression_data["new_unlocks"],
                "total_unlocked": progression_data["total_unlocked"],
                "unlock_count": len(progression_data["new_unlocks"])
            },
            "streaks": {
                "current_streak": current_streak,
                "is_milestone": "streak_milestone" in progression_data,
                "milestone_day": progression_data.get("streak_milestone")
            },
            "sanctuary": {
                "evolved": bool(sanctuary_changes),
                "changes": sanctuary_changes,
                "xp_awarded": xp_changes.get("progression_xp", 0)
            },
            "chronicles": {
                "entries_created": len(chronicle_results),
                "entry_types": chronicle_results
            },
            "storybook": {
                "new_books": storybook_results.get("new_books", []),
                "new_chapter": storybook_results.get("new_chapter"),
                "chapter_generated": storybook_results.get("chapter_generated", False)
            },
            "memories": {
                "recorded": len(memory_results),
                "memory_types": memory_results
            },
            "total_logs": total_logs,
            "has_progressions": (
                len(progression_data["new_unlocks"]) > 0 or
                "streak_milestone" in progression_data or
                bool(sanctuary_changes) or
                len(chronicle_results) > 0 or
                storybook_results.get("chapter_generated", False)
            )
        }
    
    def process_account_creation_progression(self, user_id: int, user_name: str) -> Dict[str, Any]:
        """Process progression systems for new account creation"""
        
        # Generate storybook account creation chapter
        storybook_results = generate_storybook_progression(
            self.db, user_id, "account_creation", 
            {"user_name": user_name}, {"total_unlocked": 1}
        )
        
        # Record account creation memory
        progression_data = {"account_creation": True}
        memory_results = record_progression_memories(self.db, user_id, progression_data)
        
        return {
            "artifacts": {
                "starter_unlocked": "leaf_chronicle",
                "total_unlocked": 1
            },
            "storybook": {
                "awakening_book_unlocked": True,
                "first_chapter_generated": storybook_results.get("chapter_generated", False)
            },
            "memories": {
                "account_creation_recorded": len(memory_results) > 0
            }
        }
    
    def _calculate_current_streak(self, user_id: int) -> int:
        """Calculate current consecutive daily log streak"""
        # Get daily logs from JSON structure
        daily_log_record = self.db.query(DailyLog).filter(
            DailyLog.user_id == user_id
        ).first()
        
        if not daily_log_record or not daily_log_record.daily_entries:
            return 0
        
        daily_data = json.loads(daily_log_record.daily_entries)
        
        # Convert to sorted list of dates
        log_dates = [datetime.strptime(date_str, "%Y-%m-%d").date() 
                    for date_str in daily_data.keys()]
        log_dates.sort(reverse=True)  # Newest first
        
        if not log_dates:
            return 0
        
        # Calculate consecutive streak from today backwards
        streak = 0
        today = date.today()
        expected_date = today
        
        for log_date in log_dates:
            if log_date == expected_date:
                streak += 1
                expected_date = expected_date - timedelta(days=1)
            else:
                break
        
        return streak
    
    def _get_total_logs_count(self, user_id: int) -> int:
        """Get total number of daily logs"""
        daily_log_record = self.db.query(DailyLog).filter(
            DailyLog.user_id == user_id
        ).first()
        
        if not daily_log_record or not daily_log_record.daily_entries:
            return 0
        
        daily_data = json.loads(daily_log_record.daily_entries)
        return len(daily_data)
    
    def _check_sanctuary_evolution(self, user_id: int) -> Optional[Dict]:
        """Check if sanctuary has evolved to new level"""
        sanctuary = self.db.query(SanctuaryState).filter(
            SanctuaryState.user_id == user_id
        ).first()
        
        if not sanctuary:
            return None
        
        # Calculate what level should be based on XP
        current_xp = sanctuary.xp
        old_level = sanctuary.level
        
        # Simple level calculation (can be adjusted)
        new_level = min(10, max(1, (current_xp // 1000) + 1))
        
        if new_level > old_level:
            sanctuary.level = new_level
            sanctuary.next_level_xp = new_level * 1000
            
            return {
                "old_level": old_level,
                "new_level": new_level,
                "xp": current_xp
            }
        
        return None
    
    def _process_xp_awards(self, user_id: int, artifact_results: Dict) -> Dict:
        """Process XP awards for progression events"""
        progression_xp = 0
        
        # Award XP for new artifact unlocks
        artifact_xp_values = {
            "leaf_chronicle": 0,      # No XP for starter
            "dream_shard": 250,       # Sleep mastery
            "aqua_prism": 250,        # Hydration mastery
            "harvest_basket": 350,    # Nutrition mastery
            "solar_orb": 350,         # Exercise mastery
            "spirit_deer": 500,       # Emotional balance
            "ancient_grove": 750,     # Consistency mastery
            "gold_star": 1000         # Legendary achievement
        }
        
        for artifact_key in artifact_results.get("new_unlocks", []):
            xp_award = artifact_xp_values.get(artifact_key, 100)
            progression_xp += xp_award
        
        # Award to sanctuary
        if progression_xp > 0:
            sanctuary = self.db.query(SanctuaryState).filter(
                SanctuaryState.user_id == user_id
            ).first()
            
            if sanctuary:
                sanctuary.xp += progression_xp
        
        # Also run normal XP recalculation
        recalculate_sanctuary_xp(self.db, user_id)
        
        return {
            "progression_xp": progression_xp,
            "xp_sources": "artifact_unlocks"
        }
    
    def get_progression_status(self, user_id: int) -> Dict[str, Any]:
        """Get current progression status for user"""
        from services.museum_curator import get_museum_artifacts
        from services.chronicle_generator import get_user_chronicles  
        from services.storybook_evolution import get_user_storybook
        from services.memory_integration import MemoryIntegration
        
        # Get current states
        museum_state = get_museum_artifacts(self.db, user_id)
        chronicle_entries = get_user_chronicles(self.db, user_id, limit=10)
        storybook_state = get_user_storybook(self.db, user_id)
        
        memory_integration = MemoryIntegration(self.db)
        memory_summary = memory_integration.get_memory_summary(user_id)
        
        # Calculate progression metrics
        current_streak = self._calculate_current_streak(user_id)
        total_logs = self._get_total_logs_count(user_id)
        
        sanctuary = self.db.query(SanctuaryState).filter(
            SanctuaryState.user_id == user_id
        ).first()
        
        return {
            "museum": museum_state,
            "chronicles": {
                "recent_entries": chronicle_entries,
                "total_entries": len(chronicle_entries)
            },
            "storybook": storybook_state,
            "memories": memory_summary,
            "streaks": {
                "current": current_streak,
                "next_milestone": self._get_next_streak_milestone(current_streak)
            },
            "sanctuary": {
                "level": sanctuary.level if sanctuary else 1,
                "xp": sanctuary.xp if sanctuary else 0
            },
            "totals": {
                "logs": total_logs,
                "artifacts": museum_state.get("unlocked_count", 0),
                "books": storybook_state.get("unlocked_books", 0)
            }
        }
    
    def _get_next_streak_milestone(self, current_streak: int) -> Optional[int]:
        """Get next streak milestone"""
        milestones = [7, 14, 21, 30, 50, 100]
        
        for milestone in milestones:
            if current_streak < milestone:
                return milestone
        
        return None  # Already past all milestones
    
    def _trigger_agent_updates(self, user_id: int, progression_data: Dict) -> None:
        """Trigger agent layer updates after progression events"""
        try:
            # Force refresh Master Health Agent analysis after progression
            get_master_health_analysis(self.db, user_id, force_refresh=True)
            
            # Generate story chapters for significant events
            if progression_data.get("new_unlocks"):
                for artifact_key in progression_data["new_unlocks"]:
                    generate_story_chapter(self.db, user_id, "artifact_unlock", {
                        "artifact_name": artifact_key.replace("_", " ").title()
                    })
            
            if progression_data.get("streak_milestone"):
                generate_story_chapter(self.db, user_id, "streak_milestone", {
                    "streak_days": progression_data["streak_milestone"]
                })
            
            if progression_data.get("sanctuary_evolution"):
                generate_story_chapter(self.db, user_id, "sanctuary_level_up", 
                    progression_data["sanctuary_evolution"])
        
        except Exception as e:
            print(f"Agent update trigger error: {e}")
            # Don't fail progression if agents fail


# Main public functions
def process_daily_log_progression(db: Session, user_id: int, log_data: Dict) -> Dict[str, Any]:
    """Process all progression systems after daily log submission"""
    engine = ProgressionEngine(db)
    return engine.process_daily_log_progression(user_id, log_data)


def process_account_creation_progression(db: Session, user_id: int, user_name: str) -> Dict[str, Any]:
    """Process progression systems for new account creation"""
    engine = ProgressionEngine(db)
    return engine.process_account_creation_progression(user_id, user_name)


def get_user_progression_status(db: Session, user_id: int) -> Dict[str, Any]:
    """Get current progression status for user"""
    engine = ProgressionEngine(db)
    return engine.get_progression_status(user_id)