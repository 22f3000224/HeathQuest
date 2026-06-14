"""
Companion Agent - Fox Dialogue and Interaction
Consumes Master Health Agent output to generate companion responses.
Does NOT read database directly.
"""
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from core.models import User
from services.groq_service_enhanced import generate_text_robust as generate_text
from services.master_health_agent import get_master_health_analysis

class CompanionAgent:
    """Fox companion dialogue generator"""
    
    def __init__(self, db: Session):
        self.db = db
        self._cache = {}
        self._cache_expiry = {}
    
    def get_sanctuary_welcome(self, user_id: int) -> str:
        """Generate welcome message for Sanctuary World entry"""
        cache_key = f"welcome_{user_id}"
        
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]
        
        try:
            # Get Master Agent analysis
            analysis = get_master_health_analysis(self.db, user_id)
            
            welcome = self._generate_welcome_message(analysis)
            
            # Cache for 2 hours
            self._cache[cache_key] = welcome
            self._cache_expiry[cache_key] = datetime.now() + timedelta(hours=2)
            
            return welcome
            
        except Exception as e:
            print(f"Companion Agent welcome error: {e}")
            return self._get_fallback_welcome(user_id)
    
    def get_companion_reflections(self, user_id: int) -> Dict[str, str]:
        """Generate today's and weekly reflections for Companion Screen"""
        cache_key = f"reflections_{user_id}"
        
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]
        
        try:
            # Get Master Agent analysis
            analysis = get_master_health_analysis(self.db, user_id)
            
            reflections = self._generate_reflections(analysis)
            
            # Cache for 1 hour
            self._cache[cache_key] = reflections
            self._cache_expiry[cache_key] = datetime.now() + timedelta(hours=1)
            
            return reflections
            
        except Exception as e:
            print(f"Companion Agent reflections error: {e}")
            return self._get_fallback_reflections(user_id)
    
    def get_fox_guidance(self, user_id: int) -> Dict[str, Any]:
        """Generate AI guidance for Companion Screen"""
        try:
            # Get Master Agent analysis
            analysis = get_master_health_analysis(self.db, user_id)
            
            return {
                "health_score": analysis["health_score"],
                "strengths": analysis["strengths"],
                "weaknesses": analysis["weaknesses"],
                "recommendations": analysis["recommendations"],
                "sanctuary_impact": analysis["sanctuary_status"]
            }
            
        except Exception as e:
            print(f"Companion Agent guidance error: {e}")
            return {
                "health_score": 50,
                "strengths": ["Mindful awareness"],
                "weaknesses": ["Consistency"],
                "recommendations": ["Focus on one small improvement"],
                "sanctuary_impact": "Every choice shapes the sanctuary."
            }
    
    def handle_chat_message(self, user_id: int, message: str) -> str:
        """Handle interactive chat with Fox companion"""
        try:
            # Get Master Agent analysis
            analysis = get_master_health_analysis(self.db, user_id)
            
            # Determine response type based on message content
            response_type = self._classify_chat_message(message)
            
            return self._generate_chat_response(analysis, message, response_type)
            
        except Exception as e:
            print(f"Companion Agent chat error: {e}")
            return self._get_fallback_chat_response(message)
    
    def _generate_welcome_message(self, analysis: Dict) -> str:
        """Generate contextual welcome message"""
        user_info = analysis.get("user_info", {})
        name = user_info.get("name", "Explorer")
        companion = user_info.get("companion", "fox")
        
        # Get context from analysis
        health_score = analysis.get("health_score", 50)
        today_summary = analysis.get("today_summary", "")
        sanctuary_state = analysis.get("sanctuary_state", {})
        recent_artifacts = analysis.get("recent_artifacts", [])
        
        prompt = f"""You are the {companion} companion of {name}. Generate a warm welcome message (1-2 sentences) for when they enter the sanctuary.

Current health insights: {today_summary}
Health score: {health_score}/100
Sanctuary state: {sanctuary_state}
Recent achievements: {[a['name'] for a in recent_artifacts[:2]]}

Rules:
- Speak as the {companion} companion in first person
- Reference specific sanctuary elements or recent improvements
- Be warm, encouraging, and personally aware
- Maximum 2 sentences
- Use nature metaphors, not clinical health terms"""

        try:
            response = generate_text(prompt, max_tokens=150)
            if response and len(response.strip()) > 10:
                return response.strip()
        except:
            pass
        
        return f"Welcome back to our sanctuary, {name}. The forest whispers of your continued journey."
    
    def _generate_reflections(self, analysis: Dict) -> Dict[str, str]:
        """Generate today's and weekly reflections"""
        user_info = analysis.get("user_info", {})
        name = user_info.get("name", "Explorer")
        companion = user_info.get("companion", "fox")
        
        today_summary = analysis.get("today_summary", "")
        weekly_summary = analysis.get("weekly_summary", "")
        strengths = analysis.get("strengths", [])
        observations = analysis.get("growth_observations", [])
        
        prompt = f"""You are the {companion} companion of {name}. Generate reflections for the companion screen.

Master Agent insights:
- Today: {today_summary}
- This week: {weekly_summary}
- Strengths: {strengths}
- Observations: {observations}

Generate JSON with these keys:
- today_reflection: Personal reflection on today (2-3 sentences)
- weekly_reflection: Reflection on the week (2-3 sentences)
- fox_thoughts: Current companion thoughts (2-3 sentences)

Rules:
- Speak as the {companion} companion who has witnessed the journey
- Reference specific patterns and memories
- Be encouraging but honest
- Use "I remember when..." or "I've noticed..."
- Nature metaphors, not clinical language"""

        try:
            response = generate_text(prompt, max_tokens=400)
            if response and response.strip().startswith('{'):
                parsed = json.loads(response)
                if all(key in parsed for key in ["today_reflection", "weekly_reflection", "fox_thoughts"]):
                    return parsed
        except:
            pass
        
        # Fallback reflections
        return {
            "today_reflection": f"Today I see {name} continuing their journey with thoughtful choices.",
            "weekly_reflection": f"This week has shown me the power of small, consistent steps.",
            "fox_thoughts": f"I am grateful to witness {name}'s growing awareness and care for their sanctuary."
        }
    
    def _classify_chat_message(self, message: str) -> str:
        """Classify user message to determine response type"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ["sanctuary", "rain", "weather", "forest", "river"]):
            return "sanctuary_question"
        elif any(word in message_lower for word in ["doing", "progress", "how am i"]):
            return "progress_check"
        elif any(word in message_lower for word in ["sleep", "water", "exercise", "mood", "health"]):
            return "health_advice"
        elif any(word in message_lower for word in ["help", "improve", "better", "recommendation"]):
            return "guidance_request"
        else:
            return "general_chat"
    
    def _generate_chat_response(self, analysis: Dict, message: str, response_type: str) -> str:
        """Generate contextual chat response"""
        user_info = analysis.get("user_info", {})
        name = user_info.get("name", "Explorer")
        companion = user_info.get("companion", "fox")
        
        # Prepare context based on response type
        if response_type == "sanctuary_question":
            context = f"Sanctuary state: {analysis.get('sanctuary_state', {})}, Recent changes: {analysis.get('sanctuary_status', '')}"
        elif response_type == "progress_check":
            context = f"Health score: {analysis.get('health_score', 50)}/100, Strengths: {analysis.get('strengths', [])}, Areas for growth: {analysis.get('weaknesses', [])}"
        elif response_type == "health_advice":
            context = f"Recommendations: {analysis.get('recommendations', [])}, Recent observations: {analysis.get('growth_observations', [])}"
        else:
            context = f"Today's summary: {analysis.get('today_summary', '')}"
        
        prompt = f"""You are the {companion} companion of {name}. They said: "{message}"

Your knowledge of {name}:
{context}

Response type: {response_type}

Generate a warm, personal response (2-3 sentences) that:
- Shows you know their journey intimately
- References specific patterns or sanctuary elements
- Provides gentle guidance if they're asking for help
- Uses nature metaphors and {companion} personality
- Feels like a wise, caring companion who has watched their growth

Be conversational and personal, not generic."""

        try:
            response = generate_text(prompt, max_tokens=200)
            if response and len(response.strip()) > 10:
                return response.strip()
        except:
            pass
        
        return self._get_fallback_chat_response(message)
    
    def _get_fallback_welcome(self, user_id: int) -> str:
        """Fallback welcome message"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            name = user.name if user else "Explorer"
            return f"Welcome back to our sanctuary, {name}. The forest is quiet and ready for your presence."
        except:
            return "Welcome back to our sanctuary, Explorer. The forest awaits your return."
    
    def _get_fallback_reflections(self, user_id: int) -> Dict[str, str]:
        """Fallback reflections when generation fails"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            name = user.name if user else "Explorer"
        except:
            name = "Explorer"
        
        return {
            "today_reflection": f"Today I see {name} walking their path with intention and care.",
            "weekly_reflection": f"Each day this week has added another stone to the path we're building together.",
            "fox_thoughts": f"I am honored to be {name}'s companion on this journey of growth and discovery."
        }
    
    def _get_fallback_chat_response(self, message: str) -> str:
        """Fallback chat response"""
        message_lower = message.lower()
        
        if "how" in message_lower:
            return "I've been watching your journey, and I see steady growth in small, meaningful ways."
        elif "sanctuary" in message_lower:
            return "Our sanctuary reflects the care you bring to each day - it grows stronger with your attention."
        elif "thank" in message_lower:
            return "Your gratitude warms the forest, and your dedication inspires the very trees around us."
        else:
            return "I'm here with you in this moment, witnessing your journey with gentle eyes and a caring heart."
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cache is still valid"""
        if cache_key not in self._cache_expiry:
            return False
        return datetime.now() < self._cache_expiry[cache_key]


# Public functions for API endpoints
def get_sanctuary_welcome(db: Session, user_id: int) -> str:
    """Get Fox welcome message for Sanctuary World"""
    agent = CompanionAgent(db)
    return agent.get_sanctuary_welcome(user_id)

def get_companion_reflections(db: Session, user_id: int) -> Dict[str, str]:
    """Get companion reflections for Companion Screen"""
    agent = CompanionAgent(db)
    return agent.get_companion_reflections(user_id)

def get_fox_guidance(db: Session, user_id: int) -> Dict[str, Any]:
    """Get Fox guidance for Companion Screen"""
    agent = CompanionAgent(db)
    return agent.get_fox_guidance(user_id)

def handle_companion_chat(db: Session, user_id: int, message: str) -> str:
    """Handle chat with Fox companion - now uses knowledge-first approach"""
    try:
        # Import here to avoid circular imports
        from .companion_service import get_companion_response
        
        # Get user for companion type
        user = db.query(User).filter(User.id == user_id).first()
        companion_type = user.companion if user else "fox"
        
        # Use knowledge-first system - FORCE GROQ AI RESPONSES
        response_data = get_companion_response(db, user_id, message, companion_type)
        
        if response_data.get("success", False):
            return response_data["response"]
        else:
            # If new system fails, return error message instead of fallback
            return "I'm accessing your sanctuary data to give you a proper response. Please try again in a moment."
            
    except Exception as e:
        print(f"Companion chat error: {e}")
        # Force error instead of generic fallback - this ensures we use Groq AI
        return "Let me reconnect to your sanctuary. Please try your question again."