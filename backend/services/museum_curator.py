"""
Museum Curator Service - Single source of truth for artifact progression
"""
import json
from datetime import datetime, timedelta, date
from typing import Dict, List, Any, Tuple
from sqlalchemy.orm import Session

from core.models import User, DailyLog, MuseumArtifact
from utils.json_helpers import DailyLogHelper

# Final 8 Museum Artifacts
ARTIFACT_DEFINITIONS = {
    "leaf_chronicle": {
        "display_name": "Leaf Chronicle",
        "category": "Journey",
        "theme": "Beginning",
        "unlock_condition": "account_created",
        "threshold": 1,
        "description": "The beginning of your sanctuary journey"
    },
    "dream_shard": {
        "display_name": "Dream Shard", 
        "category": "Sleep",
        "theme": "Rest",
        "unlock_condition": "sleep_average_target",
        "threshold": 7,
        "description": "Average sleep target reached for 7 logged days"
    },
    "aqua_prism": {
        "display_name": "Aqua Prism",
        "category": "Hydration", 
        "theme": "Flow",
        "unlock_condition": "hydration_goal_streak",
        "threshold": 5,
        "description": "Hydration goal reached for 5 logged days"
    },
    "harvest_basket": {
        "display_name": "Harvest Basket",
        "category": "Nutrition",
        "theme": "Nourishment", 
        "unlock_condition": "nutrition_target_streak",
        "threshold": 10,
        "description": "Nutrition target reached for 10 logged days"
    },
    "solar_orb": {
        "display_name": "Solar Orb",
        "category": "Exercise",
        "theme": "Energy",
        "unlock_condition": "exercise_streak", 
        "threshold": 10,
        "description": "Exercise streak of 10 days"
    },
    "spirit_deer": {
        "display_name": "Spirit Deer",
        "category": "Emotional Balance",
        "theme": "Harmony",
        "unlock_condition": "positive_mood_trend",
        "threshold": 14, 
        "description": "Positive mood trend for 14 logged days"
    },
    "ancient_grove": {
        "display_name": "Ancient Grove",
        "category": "Consistency", 
        "theme": "Growth",
        "unlock_condition": "total_logs",
        "threshold": 30,
        "description": "30 completed Daily Logs"
    },
    "gold_star": {
        "display_name": "Gold Star",
        "category": "Achievement",
        "theme": "Legendary Completion", 
        "unlock_condition": "all_artifacts_or_streak",
        "threshold": 100,
        "description": "All other artifacts unlocked OR 100-day streak"
    }
}

class MuseumCurator:
    """Single source of truth for artifact progression"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def ensure_artifact_record(self, user_id: int) -> MuseumArtifact:
        """Ensure user has a museum artifact record"""
        artifact_record = self.db.query(MuseumArtifact).filter(
            MuseumArtifact.user_id == user_id
        ).first()
        
        if not artifact_record:
            # Create first artifact (Leaf Chronicle) unlocked by default
            artifact_record = MuseumArtifact(
                user_id=user_id,
                artifact_name="Leaf Chronicle",
                description="The beginning of your sanctuary journey", 
                lore="This artifact marks the start of your wellness adventure.",
                unlocked=True,
                unlock_date=datetime.now()
            )
            self.db.add(artifact_record)
            self.db.flush()
        
        return artifact_record
    
    def get_daily_logs_data(self, user_id: int) -> List[Dict]:
        """Get all daily logs for progression evaluation"""
        # Get from new JSON structure
        daily_log_record = self.db.query(DailyLog).filter(
            DailyLog.user_id == user_id
        ).first()
        
        if not daily_log_record or not daily_log_record.daily_entries:
            return []
        
        # Parse JSON data and convert to list format
        daily_data = json.loads(daily_log_record.daily_entries)
        logs = []
        
        for date_str, log_data in daily_data.items():
            log_entry = {
                "date": date_str,
                **log_data
            }
            logs.append(log_entry)
        
        # Sort by date (newest first)
        logs.sort(key=lambda x: x["date"], reverse=True)
        return logs
    
    def evaluate_artifact_conditions(self, user_id: int) -> Tuple[List[str], int]:
        """Evaluate all artifact unlock conditions"""
        logs = self.get_daily_logs_data(user_id)
        
        # Get all existing artifacts for this user
        existing_artifacts = self.db.query(MuseumArtifact).filter(
            MuseumArtifact.user_id == user_id
        ).all()
        
        unlocked_artifacts = {a.artifact_name.lower().replace(" ", "_"): a for a in existing_artifacts if a.unlocked}
        new_unlocks = []
        
        for artifact_key, definition in ARTIFACT_DEFINITIONS.items():
            if artifact_key in unlocked_artifacts:
                continue  # Already unlocked
            
            condition = definition["unlock_condition"]
            threshold = definition["threshold"]
            
            if self._check_condition(condition, threshold, logs, unlocked_artifacts):
                # Create new artifact
                new_artifact = MuseumArtifact(
                    user_id=user_id,
                    artifact_name=definition["display_name"],
                    description=definition["description"],
                    lore=f"Unlocked by {definition['description']}",
                    unlocked=True,
                    unlock_date=datetime.now()
                )
                self.db.add(new_artifact)
                new_unlocks.append(artifact_key)
        
        total_unlocked = len(unlocked_artifacts) + len(new_unlocks)
        return new_unlocks, total_unlocked
    
    def _check_condition(self, condition: str, threshold: int, logs: List[Dict], unlocked_artifacts: Dict) -> bool:
        """Check if specific condition is met"""
        if condition == "account_created":
            return True  # Always unlocked
        
        if condition == "sleep_average_target":
            return self._check_sleep_average(logs, threshold)
        
        if condition == "hydration_goal_streak":
            return self._check_hydration_streak(logs, threshold)
        
        if condition == "nutrition_target_streak":
            return self._check_nutrition_streak(logs, threshold)
        
        if condition == "exercise_streak":
            return self._check_exercise_streak(logs, threshold)
        
        if condition == "positive_mood_trend":
            return self._check_mood_trend(logs, threshold)
        
        if condition == "total_logs":
            return len(logs) >= threshold
        
        if condition == "all_artifacts_or_streak":
            # Check if all other artifacts are unlocked OR 100-day streak
            other_artifacts = [k for k in ARTIFACT_DEFINITIONS.keys() if k != "gold_star"]
            all_unlocked = all(k in unlocked_artifacts for k in other_artifacts)
            
            if all_unlocked:
                return True
            
            # Check 100-day streak
            return self._check_consecutive_streak(logs) >= threshold
        
        return False
    
    def _check_sleep_average(self, logs: List[Dict], days: int) -> bool:
        """Check if sleep average target reached for specified days"""
        if len(logs) < days:
            return False
        
        recent_logs = logs[:days]
        sleep_scores = [log.get("sleep", 0) for log in recent_logs]
        average_sleep = sum(sleep_scores) / len(sleep_scores) if sleep_scores else 0
        
        return average_sleep >= 7  # 7+ hour average
    
    def _check_hydration_streak(self, logs: List[Dict], days: int) -> bool:
        """Check hydration goal streak"""
        if len(logs) < days:
            return False
        
        recent_logs = logs[:days]
        return all(log.get("water", 0) >= 6 for log in recent_logs)  # 6+ glasses
    
    def _check_nutrition_streak(self, logs: List[Dict], days: int) -> bool:
        """Check nutrition target streak"""
        if len(logs) < days:
            return False
        
        recent_logs = logs[:days]
        return all(log.get("nutrition", 0) >= 7 for log in recent_logs)  # 7+ nutrition score
    
    def _check_exercise_streak(self, logs: List[Dict], days: int) -> bool:
        """Check exercise streak"""
        if len(logs) < days:
            return False
        
        recent_logs = logs[:days]
        return all(log.get("exercise", 0) >= 6 for log in recent_logs)  # 6+ exercise score
    
    def _check_mood_trend(self, logs: List[Dict], days: int) -> bool:
        """Check positive mood trend"""
        if len(logs) < days:
            return False
        
        recent_logs = logs[:days]
        mood_scores = [log.get("mood", 0) for log in recent_logs]
        average_mood = sum(mood_scores) / len(mood_scores) if mood_scores else 0
        
        return average_mood >= 7  # 7+ average mood
    
    def _check_consecutive_streak(self, logs: List[Dict]) -> int:
        """Calculate consecutive daily log streak"""
        if not logs:
            return 0
        
        streak = 0
        today = date.today()
        expected_date = today
        
        for log in logs:
            log_date = datetime.strptime(log["date"], "%Y-%m-%d").date()
            
            if log_date == expected_date:
                streak += 1
                expected_date = expected_date - timedelta(days=1)
            else:
                break
        
        return streak
    
    def get_museum_state(self, user_id: int) -> Dict:
        """Get complete museum state for user"""
        # Ensure user has at least the initial artifact
        self.ensure_artifact_record(user_id)
        
        # Get all artifacts for user
        artifacts = self.db.query(MuseumArtifact).filter(
            MuseumArtifact.user_id == user_id
        ).all()
        
        museum_artifacts = []
        
        for artifact in artifacts:
            museum_artifacts.append({
                "id": artifact.id,
                "artifact_name": artifact.artifact_name,
                "description": artifact.description,
                "lore": artifact.lore,
                "unlocked": artifact.unlocked,
                "unlock_date": artifact.unlock_date.isoformat() if artifact.unlock_date else None
            })
        
        unlocked_count = len([a for a in artifacts if a.unlocked])
        
        return {
            "artifacts": museum_artifacts,
            "unlocked_count": unlocked_count,
            "total_count": len(artifacts)
        }


def evaluate_progression(db: Session, user_id: int) -> Dict[str, Any]:
    """Main function to evaluate user progression and unlock artifacts"""
    curator = MuseumCurator(db)
    new_unlocks, total_unlocked = curator.evaluate_artifact_conditions(user_id)
    
    return {
        "new_unlocks": new_unlocks,
        "total_unlocked": total_unlocked,
        "artifacts_unlocked": len(new_unlocks) > 0
    }


def get_museum_artifacts(db: Session, user_id: int) -> Dict[str, Any]:
    """Get museum state for user"""
    curator = MuseumCurator(db)
    return curator.get_museum_state(user_id)