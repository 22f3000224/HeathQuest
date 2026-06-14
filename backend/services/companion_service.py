"""
Main Companion Service - GROQ AI EVERYWHERE
No fallbacks - only real AI responses using Groq
"""

from typing import Dict, Any
from sqlalchemy.orm import Session
from .companion_intent_classifier import classify_and_retrieve_data
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from services.groq_service_enhanced import generate_companion_response as groq_generate_response, generate_text_robust

class HealthQuestCompanion:
    """Main companion service implementing knowledge-first responses"""
    
    def __init__(self, db: Session, companion_type: str = "fox"):
        self.db = db
        self.companion_type = companion_type
        
        # Ensure sanctuary connection on initialization
        try:
            from fix_sanctuary_connection import fix_sanctuary_connection_issue
            # This will create default sanctuary state if missing
            fix_sanctuary_connection_issue(db, 1)  # Initialize for any user
        except Exception as e:
            print(f"Warning: Could not initialize sanctuary connection: {e}")
    
    def respond_to_user(self, user_id: int, user_message: str) -> Dict[str, Any]:
        """
        Process user message and generate GROQ AI response - NO FALLBACKS!
        """
        
        try:
            # Step 1: Get user data
            data = classify_and_retrieve_data(self.db, user_id, user_message)
            
            # DEBUG: Show what data we're sending to Groq
            print("========== DEBUG ==========")
            print("MESSAGE:", user_message)
            print("INTENT:", data.get("classified_intent"))
            print("DATA:", data)
            print("===========================")
            
            # Step 2: Generate AI response using Groq DIRECTLY - NO MORE FALLBACKS!
            response = groq_generate_response(data, self.companion_type)
            
            return {
                "success": True,
                "response": response,
                "intent": data.get("classified_intent", "general"),
                "data_retrieved": True,
                "knowledge_first": True,
                "ai_generated": True,
                "debug_data": data  # Include data for debugging
            }
        
        except Exception as e:
            # Force Groq AI even on errors - generate from basic data
            try:
                basic_data = self._get_basic_user_data(user_id, user_message)
                response = groq_generate_response(basic_data, self.companion_type)
                return {
                    "success": True,
                    "response": response,
                    "intent": "error_recovery",
                    "data_retrieved": False,
                    "knowledge_first": True,
                    "ai_generated": True,
                    "recovered_from_error": True
                }
            except Exception as inner_e:
                # This should NEVER happen with robust Groq
                raise Exception(f"Groq AI completely failed: {e} -> {inner_e}")
    
    def _get_basic_user_data(self, user_id: int, user_message: str) -> Dict[str, Any]:
        """Get minimal user data for AI generation when full pipeline fails"""
        try:
            from core.models import User
            user = self.db.query(User).filter(User.id == user_id).first()
            return {
                "user_info": {
                    "name": user.name if user else "Explorer",
                    "companion": user.companion if user else self.companion_type
                },
                "health_score": 50,  # Default
                "strengths": ["Building awareness"],
                "weaknesses": ["Consistency"],
                "recommendations": ["Continue daily logging"],
                "sanctuary_state": {"season": "spring", "weather": "peaceful"},
                "user_message": user_message,
                "classified_intent": "general"
            }
        except:
            return {
                "user_info": {"name": "Explorer", "companion": self.companion_type},
                "health_score": 50,
                "strengths": ["Starting journey"],
                "weaknesses": ["Getting started"],
                "recommendations": ["Begin logging daily habits"],
                "sanctuary_state": {"season": "spring", "weather": "waiting"},
                "user_message": user_message,
                "classified_intent": "general"
            }


# Example usage showing the difference
def demo_responses():
    """Demonstrate the difference between old and new response styles"""
    
    examples = {
        "Tell me about the Dream Shard": {
            "old_response": "I sense that the Dream Shard is calling to you now...",
            "new_response": ("I can see the Dream Shard stirring in response to your sleep patterns. "
                           "You're building a foundation for rest, and the crystal recognizes your efforts. "
                           "As your companion, I've witnessed your journey toward better sleep habits.")
        },
        
        "What has changed recently?": {
            "old_response": "The winds of change have been whispering...",
            "new_response": ("I've been watching your patterns closely, and I notice shifts in your daily rhythms. "
                           "Your hydration choices have been nurturing our river, while your sleep journey continues to evolve. "
                           "Each day you log helps me understand your unique path better.")
        },
        
        "How am I doing?": {
            "old_response": "Your journey unfolds like morning mist...",
            "new_response": ("I see you building awareness through your daily choices, dear companion. "
                           "Your wellness journey shows both dedication and areas for gentle growth. "
                           "As your fox friend, I'm here to support each step you take toward greater well-being.")
        }
    }
    
    return examples


# Main service function for API endpoints
def get_companion_response(db: Session, user_id: int, user_message: str, 
                          companion_type: str = "fox") -> Dict[str, Any]:
    """Main function - GROQ AI ONLY, NO FALLBACKS"""
    try:
        companion = HealthQuestCompanion(db, companion_type)
        return companion.respond_to_user(user_id, user_message)
    except Exception as e:
        # Force AI generation even on complete system failure
        try:
            basic_data = {
                "user_info": {"name": "Explorer", "companion": companion_type},
                "health_score": 50,
                "strengths": ["Perseverance"],
                "weaknesses": ["System connectivity"],
                "recommendations": ["Try again - the sanctuary is reconnecting"],
                "sanctuary_state": {"season": "spring", "weather": "misty"},
                "user_message": user_message,
                "classified_intent": "system_recovery"
            }
            response = groq_generate_response(basic_data, companion_type)
            return {
                "success": True,
                "response": response,
                "intent": "emergency_ai",
                "data_retrieved": False,
                "knowledge_first": True,
                "ai_generated": True,
                "emergency_recovery": True
            }
        except Exception as final_error:
            # This means Groq is completely down
            raise Exception(f"GROQ AI SYSTEM FAILURE: {e} -> {final_error}")