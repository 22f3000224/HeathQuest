"""
Companion Response Generator
Generates data-driven responses with personality decoration (80% knowledge + 20% personality)
"""

from typing import Dict, Any, List
from .companion_intent_classifier import IntentType

class CompanionResponseGenerator:
    """Generates knowledge-first responses with companion personality"""
    
    def __init__(self, companion_type: str = "fox"):
        self.companion_type = companion_type
        self.personality_phrases = self._get_personality_phrases()
    
    def generate_response(self, data: Dict[str, Any]) -> str:
        """Generate response based on retrieved data and intent"""
        intent = data.get("classified_intent", "general")
        
        if intent == "artifact":
            return self._generate_artifact_response(data)
        elif intent == "progress":
            return self._generate_progress_response(data)
        elif intent == "health":
            return self._generate_health_response(data)
        elif intent == "sanctuary":
            return self._generate_sanctuary_response(data)
        else:
            return self._generate_general_response(data)
    
    def _generate_artifact_response(self, data: Dict[str, Any]) -> str:
        """Generate artifact-focused response with real information"""
        target_artifact = data.get("target_artifact")
        user_artifacts = data.get("user_artifacts", [])
        
        if target_artifact:
            name = target_artifact.get("name", "Unknown Artifact")
            description = target_artifact.get("description", "A mysterious artifact")
            unlock_condition = target_artifact.get("unlock_condition", "Unknown condition")
            is_unlocked = target_artifact.get("is_unlocked", False)
            progress = target_artifact.get("unlock_progress", 0)
            
            response_parts = []
            
            # Core information (80%)
            response_parts.append(f"The {name} {description.lower()}.")
            
            if is_unlocked:
                response_parts.append(f"You have awakened this artifact through {unlock_condition.lower()}.")
            else:
                response_parts.append(f"To awaken it, you must {unlock_condition.lower()}.")
                if progress > 0:
                    response_parts.append(f"You currently have {progress}% progress toward unlocking it.")
                else:
                    response_parts.append("You haven't begun the journey to unlock it yet.")
            
            # Personality decoration (20%)
            if progress > 50:
                response_parts.append(self._get_personality_phrase("artifact_close"))
            elif progress > 0:
                response_parts.append(self._get_personality_phrase("artifact_progress"))
            else:
                response_parts.append(self._get_personality_phrase("artifact_beginning"))
            
            return " ".join(response_parts)
        
        else:
            # No specific artifact mentioned
            unlocked_count = len([a for a in user_artifacts if a.get("is_unlocked", False)])
            total_count = len(user_artifacts)
            
            response = f"You have awakened {unlocked_count} of {total_count} artifacts in your sanctuary."
            
            if unlocked_count > 0:
                recent = [a["name"] for a in user_artifacts if a.get("is_unlocked")][:2]
                response += f" Your most recent discoveries include the {', '.join(recent)}."
            
            response += " " + self._get_personality_phrase("artifact_general")
            
            return response
    
    def _generate_progress_response(self, data: Dict[str, Any]) -> str:
        """Generate progress-focused response with specific changes"""
        health_changes = data.get("health_changes", {})
        recent_artifacts = data.get("recent_artifacts", [])
        trends = data.get("trends", {})
        
        response_parts = []
        
        # Specific health changes (80% of response)
        if health_changes:
            for component, change_data in health_changes.items():
                direction = change_data["direction"]
                change_value = abs(change_data["change"])
                
                if component == "sleep" and change_value > 0.2:
                    if direction == "improving":
                        response_parts.append(f"Your sleep improved by {change_value:.1f} hours over the recent week.")
                    else:
                        response_parts.append(f"Your sleep decreased by {change_value:.1f} hours recently.")
                
                elif component == "water" and change_value > 0.5:
                    if direction == "improving":
                        response_parts.append(f"Your hydration increased by {change_value:.1f} glasses daily.")
                    else:
                        response_parts.append(f"Your hydration dropped by {change_value:.1f} glasses daily.")
                
                elif component == "mood" and change_value > 0.5:
                    if direction == "improving":
                        response_parts.append(f"Your mood ratings improved by {change_value:.1f} points.")
                    else:
                        response_parts.append(f"Your mood ratings declined by {change_value:.1f} points.")
        
        # Artifact changes
        if recent_artifacts:
            artifact_names = [a.get("name", "Unknown") for a in recent_artifacts]
            response_parts.append(f"You recently awakened the {', '.join(artifact_names)}.")
        else:
            response_parts.append("No new artifacts were unlocked recently.")
        
        # If no significant changes
        if not response_parts:
            response_parts.append("Your patterns have remained steady over the recent week.")
            response_parts.append("Consistency in tracking is building your foundation.")
        
        # Personality decoration (20%)
        response_parts.append(self._get_personality_phrase("progress_summary"))
        
        return " ".join(response_parts)
    
    def _generate_health_response(self, data: Dict[str, Any]) -> str:
        """Generate health-focused response using Groq AI instead of hardcoded responses"""
        # Import Groq AI service
        try:
            from services.groq_service_enhanced import generate_text_robust
            
            user_info = data.get("user_info", {})
            name = user_info.get("name", "Explorer")
            companion_type = user_info.get("companion", "fox")
            
            health_summary = data.get("health_summary", {})
            overall_score = data.get("overall_score", 0)
            component_scores = data.get("component_scores", {})
            strengths = data.get("strengths", [])
            weaknesses = data.get("weaknesses", [])
            recommendations = data.get("recommendations", [])
            
            prompt = f"""You are the {companion_type} companion of {name}. They asked about their health.
            
Your knowledge of {name}:
- Health score: {overall_score}/100
- Component scores: {component_scores}
- Strengths: {strengths}
- Areas needing attention: {weaknesses}
- Recommendations: {recommendations}

As their devoted {companion_type} companion who has watched their journey, respond (2-3 sentences) with:
- Specific insights about their health patterns
- Personal encouragement based on actual data
- Gentle guidance that fits their situation
- {companion_type} warmth and wisdom

Reference their actual numbers and be personally supportive."""
            
            return generate_text_robust(prompt, max_tokens=250)
            
        except Exception as e:
            print(f"Groq AI health response failed: {e}")
            return f"I'm gathering insights about your wellness journey to give you a proper response, {data.get('user_info', {}).get('name', 'Explorer')}. Please try again in a moment."
    
    def _generate_sanctuary_response(self, data: Dict[str, Any]) -> str:
        """Generate sanctuary-focused response with environmental explanations"""
        sanctuary_state = data.get("sanctuary_state", {})
        influences = data.get("sanctuary_influences", {})
        health_metrics = data.get("health_metrics", {})
        
        response_parts = []
        
        # Current sanctuary state (80%)
        level = sanctuary_state.get("level", 1)
        sky = sanctuary_state.get("sky", "unknown")
        river = sanctuary_state.get("river", "unknown")
        weather = sanctuary_state.get("weather", "unknown")
        
        response_parts.append(f"Your sanctuary is Level {level} with {sky} skies and a {river} river.")
        
        # Explain environmental factors
        if influences:
            for element, explanation in influences.items():
                response_parts.append(explanation + ".")
        else:
            component_scores = health_metrics.get("component_scores", {})
            if component_scores:
                avg_score = sum(component_scores.values()) / len(component_scores)
                if avg_score >= 70:
                    response_parts.append("Your strong health patterns maintain the sanctuary's vibrant state.")
                else:
                    response_parts.append("The sanctuary reflects your current health journey.")
        
        # Personality decoration (20%)
        response_parts.append(self._get_personality_phrase("sanctuary_explanation"))
        
        return " ".join(response_parts)
    
    def _generate_general_response(self, data: Dict[str, Any]) -> str:
        """Generate general overview response"""
        health_summary = data.get("health_summary", {})
        overall_score = health_summary.get("health_score", 0)
        
        response_parts = []
        
        # General status (80%)
        response_parts.append(f"Your health foundation shows a score of {overall_score}/100.")
        
        strengths = health_summary.get("strengths", [])
        if strengths:
            response_parts.append(f"Your strengths include: {', '.join(strengths[:2]).lower()}.")
        
        recommendations = health_summary.get("recommendations", [])
        if recommendations:
            response_parts.append(f"Consider focusing on: {recommendations[0].lower()}.")
        
        # Personality decoration (20%)
        response_parts.append(self._get_personality_phrase("general_support"))
        
        return " ".join(response_parts)
    
    def _get_personality_phrases(self) -> Dict[str, List[str]]:
        """Get personality phrases for the fox companion"""
        return {
            "artifact_close": [
                "The crystal pulses with growing energy as you near your goal.",
                "I sense the artifact stirring, awaiting your final steps.",
                "Your dedication has brought you close to awakening."
            ],
            "artifact_progress": [
                "The artifact recognizes your efforts and begins to respond.",
                "Your journey toward unlocking continues to strengthen the connection.",
                "I can feel the artifact's energy building with your progress."
            ],
            "artifact_beginning": [
                "The artifact rests quietly, waiting for your journey to begin.",
                "This artifact holds potential that your actions can unlock.",
                "The path to awakening starts with your next mindful choice."
            ],
            "artifact_general": [
                "Each artifact tells the story of your growth and dedication.",
                "Your collection reflects the strength you've built within.",
                "The artifacts respond to your consistent care for yourself."
            ],
            "progress_summary": [
                "These changes show your growing awareness and intention.",
                "Your patterns reveal the path you're walking toward wellness.",
                "Each tracked day adds to your foundation of understanding."
            ],
            "health_excellent": [
                "Your dedication shines through in these strong patterns.",
                "The sanctuary thrives when you care for yourself this well.",
                "Your consistent efforts have built a solid foundation."
            ],
            "health_good": [
                "You're building steady momentum in your wellness journey.",
                "Your efforts are creating positive patterns worth celebrating.",
                "The foundation you're building grows stronger each day."
            ],
            "health_needs_work": [
                "Every beginning holds the potential for transformation.",
                "Your awareness is the first step toward positive change.",
                "Small, consistent steps will guide you toward your goals."
            ],
            "sanctuary_explanation": [
                "The sanctuary is a reflection of your inner state and care.",
                "As you nurture yourself, the sanctuary responds and grows.",
                "Your wellness choices shape the world around you here."
            ],
            "general_support": [
                "Your journey of self-care continues with each mindful choice.",
                "The path to wellness is built one conscious decision at a time.",
                "Your commitment to growth shapes everything around you."
            ]
        }
    
    def _get_personality_phrase(self, context: str) -> str:
        """Get a personality phrase for the given context"""
        phrases = self.personality_phrases.get(context, ["Your journey continues."])
        import random
        return random.choice(phrases)


# Service function for other modules
def generate_companion_response(data: Dict[str, Any], companion_type: str = "fox") -> str:
    """Generate a data-driven companion response with personality"""
    generator = CompanionResponseGenerator(companion_type)
    return generator.generate_response(data)