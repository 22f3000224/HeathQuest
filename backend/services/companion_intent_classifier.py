"""
Companion Intent Classification System
Classifies user questions and retrieves relevant data before generating responses.
"""

from enum import Enum
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from .master_health_agent import get_master_health_analysis
from .artifact_service import get_user_artifacts, get_artifact_details
from .memory_service import get_recent_memories
from .chronicle_service import get_recent_chronicles
from .sanctuary_service import get_sanctuary_state

class IntentType(Enum):
    ARTIFACT_QUESTION = "artifact"
    PROGRESS_QUESTION = "progress" 
    HEALTH_QUESTION = "health"
    SANCTUARY_QUESTION = "sanctuary"
    GENERAL_QUESTION = "general"

class CompanionIntentClassifier:
    """Classifies user intent and retrieves relevant data"""
    
    def __init__(self, db: Session):
        self.db = db
        
        # Intent classification keywords
        self.intent_keywords = {
            IntentType.ARTIFACT_QUESTION: [
                "dream shard", "artifact", "crystal", "prism", "gem", "relic",
                "unlock", "awaken", "tell me about", "what is", "shard", "stone"
            ],
            IntentType.PROGRESS_QUESTION: [
                "changed recently", "what's new", "progress", "improved", 
                "recent", "lately", "past week", "last week", "updates"
            ],
            IntentType.HEALTH_QUESTION: [
                "how am i doing", "health", "score", "doing", "feeling",
                "progress", "improvement", "better", "worse", "sleep", "water", "mood", "exercise"
            ],
            IntentType.SANCTUARY_QUESTION: [
                "sanctuary", "raining", "weather", "sky", "river", "environment",
                "storm", "sunny", "cloudy", "overcast", "season", "forest"
            ]
        }
    
    def classify_intent(self, user_message: str) -> IntentType:
        """Classify user intent using Groq AI instead of keywords"""
        try:
            # Import here to avoid circular dependencies
            from services.groq_service_enhanced import generate_text_robust
            
            prompt = f"""Classify this user message into ONE category only.

Return EXACTLY one of these words:
artifact
progress 
health
sanctuary
general

Classification rules:
- artifact: Questions about unlocking, crystals, shards, gems, museum items
- progress: Questions about recent changes, improvements, what's new
- health: Questions about wellness, sleep, water, exercise, mood, how they're doing
- sanctuary: Questions about environment, weather, sky, river, why sanctuary looks a certain way
- general: Everything else, greetings, conversations, unclear questions

Message: "{user_message}"

Classification:"""
            
            response = generate_text_robust(prompt, max_tokens=10)
            classification = response.strip().lower()
            
            # Map response to enum
            intent_map = {
                "artifact": IntentType.ARTIFACT_QUESTION,
                "progress": IntentType.PROGRESS_QUESTION,
                "health": IntentType.HEALTH_QUESTION, 
                "sanctuary": IntentType.SANCTUARY_QUESTION,
                "general": IntentType.GENERAL_QUESTION
            }
            
            return intent_map.get(classification, IntentType.GENERAL_QUESTION)
            
        except Exception as e:
            print(f"Groq classification failed, falling back to keywords: {e}")
            return self._classify_intent_keywords(user_message)
    
    def _classify_intent_keywords(self, user_message: str) -> IntentType:
        """Fallback keyword-based classification"""
        message_lower = user_message.lower()
        
        # Count keyword matches for each intent type
        intent_scores = {}
        for intent_type, keywords in self.intent_keywords.items():
            score = sum(1 for keyword in keywords if keyword in message_lower)
            intent_scores[intent_type] = score
        
        # Return intent with highest score, default to general
        if max(intent_scores.values()) > 0:
            return max(intent_scores.items(), key=lambda x: x[1])[0]
        
        return IntentType.GENERAL_QUESTION
    
    def retrieve_data_for_intent(self, intent: IntentType, user_id: int, 
                               message: str = "") -> Dict[str, Any]:
        """Retrieve relevant data based on classified intent"""
        
        if intent == IntentType.ARTIFACT_QUESTION:
            return self._get_artifact_data(user_id, message)
        
        elif intent == IntentType.PROGRESS_QUESTION:
            return self._get_progress_data(user_id)
        
        elif intent == IntentType.HEALTH_QUESTION:
            return self._get_health_data(user_id)
        
        elif intent == IntentType.SANCTUARY_QUESTION:
            return self._get_sanctuary_data(user_id)
        
        else:  # GENERAL_QUESTION
            return self._get_general_data(user_id)
    
    def _get_artifact_data(self, user_id: int, message: str) -> Dict[str, Any]:
        """Retrieve artifact-specific data"""
        # Extract artifact name from message
        artifact_name = self._extract_artifact_name(message)
        
        data = {
            "intent_type": "artifact",
            "user_artifacts": get_user_artifacts(self.db, user_id),
            "recent_unlocks": self._get_recent_artifact_unlocks(user_id),
            "target_artifact": None
        }
        
        if artifact_name:
            data["target_artifact"] = get_artifact_details(self.db, artifact_name, user_id)
        
        return data
    
    def _get_progress_data(self, user_id: int) -> Dict[str, Any]:
        """Retrieve progress and recent changes data"""
        health_summary = get_master_health_analysis(self.db, user_id)
        
        return {
            "intent_type": "progress",
            "recent_memories": get_recent_memories(self.db, user_id, days=7),
            "recent_chronicles": get_recent_chronicles(self.db, user_id, days=7),
            "recent_artifacts": self._get_recent_artifact_unlocks(user_id, days=7),
            "trends": health_summary.get("trends", {}),
            "health_changes": self._extract_health_changes(health_summary),
            "sanctuary_changes": self._get_sanctuary_changes(user_id)
        }
    
    def _get_health_data(self, user_id: int) -> Dict[str, Any]:
        """Retrieve comprehensive health data"""
        health_summary = get_master_health_analysis(self.db, user_id)
        
        return {
            "intent_type": "health",
            "health_summary": health_summary,
            "component_scores": health_summary.get("raw_metrics", {}).get("component_scores", {}),
            "overall_score": health_summary.get("health_score", 0),
            "strengths": health_summary.get("strengths", []),
            "weaknesses": health_summary.get("weaknesses", []),
            "recommendations": health_summary.get("recommendations", [])
        }
    
    def _get_sanctuary_data(self, user_id: int) -> Dict[str, Any]:
        """Retrieve sanctuary state and related health metrics"""
        sanctuary_state = get_sanctuary_state(self.db, user_id)
        health_summary = get_master_health_analysis(self.db, user_id)
        
        return {
            "intent_type": "sanctuary", 
            "sanctuary_state": sanctuary_state,
            "health_metrics": health_summary.get("raw_metrics", {}),
            "sanctuary_influences": self._get_sanctuary_influences(health_summary)
        }
    
    def _get_general_data(self, user_id: int) -> Dict[str, Any]:
        """Retrieve minimal general data - avoid health dominance"""
        return {
            "intent_type": "general",
            "user_info": self._get_basic_user_info(user_id),
            "sanctuary_state": get_sanctuary_state(self.db, user_id),
            "companion_type": self._get_companion_type(user_id)
        }
    
    def _get_basic_user_info(self, user_id: int) -> Dict[str, Any]:
        """Get basic user information without health data"""
        try:
            from core.models import User
            user = self.db.query(User).filter(User.id == user_id).first()
            return {
                "name": user.name if user else "Explorer",
                "companion": user.companion if user else "fox",
                "user_id": user_id
            }
        except:
            return {
                "name": "Explorer",
                "companion": "fox", 
                "user_id": user_id
            }
    
    def _get_companion_type(self, user_id: int) -> str:
        """Get user's companion type"""
        try:
            from core.models import User
            user = self.db.query(User).filter(User.id == user_id).first()
            return user.companion if user else "fox"
        except:
            return "fox"
    
    def _extract_artifact_name(self, message: str) -> Optional[str]:
        """Extract artifact name from user message"""
        # Common artifact names to look for
        artifacts = ["dream shard", "aqua prism", "vitality crystal", "mood gem"]
        
        message_lower = message.lower()
        for artifact in artifacts:
            if artifact in message_lower:
                return artifact
        
        return None
    
    def _get_recent_artifact_unlocks(self, user_id: int, days: int = 7) -> List[Dict]:
        """Get recently unlocked artifacts"""
        # This would integrate with your artifact system
        # Placeholder implementation
        return []
    
    def _extract_health_changes(self, health_summary: Dict) -> Dict[str, Any]:
        """Extract meaningful health changes from summary"""
        trends = health_summary.get("trends", {})
        changes = {}
        
        for component in ["sleep", "water", "mood", "exercise", "nutrition"]:
            direction = trends.get(f"{component}_direction")
            change_value = trends.get(f"{component}_change", 0)
            
            if direction and direction != "insufficient_data":
                changes[component] = {
                    "direction": direction,
                    "change": change_value,
                    "status": "improving" if direction == "improving" else "declining"
                }
        
        return changes
    
    def _get_sanctuary_changes(self, user_id: int) -> Dict[str, Any]:
        """Get recent sanctuary state changes"""
        # This would track sanctuary state over time
        # Placeholder implementation
        return {"recent_changes": []}
    
    def _get_sanctuary_influences(self, health_summary: Dict) -> Dict[str, str]:
        """Determine what health metrics influence sanctuary state"""
        influences = {}
        components = health_summary.get("raw_metrics", {}).get("component_scores", {})
        
        if components.get("sleep", 0) < 50:
            influences["sky"] = "Sleep below target affects sky clarity"
        
        if components.get("water", 0) < 50:
            influences["river"] = "Hydration below target affects river flow"
        
        if components.get("mood", 0) < 50:
            influences["weather"] = "Mood patterns influence weather"
        
        return influences


# Service function for other modules
def classify_and_retrieve_data(db: Session, user_id: int, 
                             user_message: str) -> Dict[str, Any]:
    """Main function to classify intent and retrieve relevant data"""
    classifier = CompanionIntentClassifier(db)
    
    # Classify the user's intent
    intent = classifier.classify_intent(user_message)
    
    # DEBUG: Log classification to help debug issues
    print(f"[COMPANION] message='{user_message}' intent='{intent.value}'")
    
    # Retrieve relevant data
    data = classifier.retrieve_data_for_intent(intent, user_id, user_message)
    
    # Add classification metadata
    data["classified_intent"] = intent.value
    data["original_message"] = user_message
    
    return data