#!/usr/bin/env python3
"""
Enhanced Groq Service for HealthQuest AI
Complete companion system with validation, error handling, and all intent types
"""

import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass
import time
import json
from typing import Optional, Dict, Any, List, Tuple
from groq import Groq

# Enhanced constants
GROQ_MODEL = "llama-3.3-70b-versatile"
BACKUP_MODEL = "llama-3.1-8b-instant"
MAX_RETRIES = 3
RETRY_DELAY = 1
MAX_RESPONSE_TOKENS = 300
MAX_SUMMARY_TOKENS = 400

_client = None

def validate_user_data(user_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate user data structure and return validation status with error messages"""
    errors = []
    
    if not isinstance(user_data, dict):
        return False, ["User data must be a dictionary"]
    
    # Validate user_info structure
    if 'user_info' in user_data and not isinstance(user_data['user_info'], dict):
        errors.append("user_info must be a dictionary")
    
    # Validate health metrics if present
    if 'health_metrics' in user_data:
        metrics = user_data['health_metrics']
        if not isinstance(metrics, dict):
            errors.append("health_metrics must be a dictionary")
    
    # Validate sanctuary state if present
    if 'sanctuary_state' in user_data:
        sanctuary = user_data['sanctuary_state']
        if not isinstance(sanctuary, dict):
            errors.append("sanctuary_state must be a dictionary")
    
    # Validate arrays if present
    array_fields = ['strengths', 'weaknesses', 'recommendations', 'user_artifacts', 'memories', 'chapters']
    for field in array_fields:
        if field in user_data and not isinstance(user_data[field], list):
            errors.append(f"{field} must be a list")
    
    return len(errors) == 0, errors

def sanitize_user_input(user_message: str) -> str:
    """Sanitize user input to prevent prompt injection"""
    if not isinstance(user_message, str):
        return "Invalid input"
    
    # Remove potentially harmful content
    sanitized = user_message.replace('"""', '').replace('```', '')
    
    # Limit length
    if len(sanitized) > 500:
        sanitized = sanitized[:500] + "..."
    
    return sanitized.strip()

def extract_sanctuary_data(sanctuary_state: Dict[str, Any]) -> Dict[str, str]:
    """Safely extract sanctuary data with proper fallbacks"""
    def safe_get(key: str, default: str = 'unknown') -> str:
        if hasattr(sanctuary_state, key):
            return str(getattr(sanctuary_state, key, default))
        return str(sanctuary_state.get(key, default))
    
    return {
        'sky': safe_get('sky'),
        'river': safe_get('river'),
        'forest': safe_get('forest'), 
        'weather': safe_get('weather'),
        'season': safe_get('season'),
        'level': str(safe_get('level', '1'))
    }

def _get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY is not set in environment")
        _client = Groq(api_key=api_key)
    return _client

def generate_text_robust(prompt: str, max_tokens: int = MAX_RESPONSE_TOKENS, retries: int = MAX_RETRIES) -> str:
    """Generate text with Groq AI - GUARANTEED to return AI content"""
    
    if not prompt or not prompt.strip():
        raise ValueError("Prompt cannot be empty")
    
    if len(prompt) > 8000:
        prompt = prompt[:8000] + "..."
    
    # Try primary model first
    for attempt in range(retries):
        try:
            client = _get_client()
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=0.7,
            )
            
            text = response.choices[0].message.content
            if text and text.strip():
                return text.strip()
                
        except Exception as e:
            print(f"Groq primary model attempt {attempt + 1} failed: {e}")
            if attempt < retries - 1:
                time.sleep(RETRY_DELAY)
    
    # Try backup model if primary fails
    print("Primary model failed, trying backup model...")
    for attempt in range(retries):
        try:
            client = _get_client()
            response = client.chat.completions.create(
                model=BACKUP_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=0.7,
            )
            
            text = response.choices[0].message.content
            if text and text.strip():
                print("Backup model succeeded!")
                return text.strip()
                
        except Exception as e:
            print(f"Backup model attempt {attempt + 1} failed: {e}")
            if attempt < retries - 1:
                time.sleep(RETRY_DELAY)
    
    raise Exception("All Groq AI models failed - check API key and connection")

def generate_companion_response(user_data: Dict[str, Any], companion_type: str = "fox") -> str:
    """Generate companion response using Groq AI - HIGHLY PERSONALIZED with enhanced validation"""
    
    # Validate input data
    is_valid, errors = validate_user_data(user_data)
    if not is_valid:
        print(f"Validation errors: {errors}")
        return "I don't see that information in your sanctuary yet."
    
    # Validate companion type
    valid_companions = ['fox', 'owl', 'deer', 'wolf', 'rabbit']
    if companion_type not in valid_companions:
        companion_type = 'fox'
    
    # Extract and sanitize user info
    user_name = user_data.get("user_info", {}).get("name", "Explorer")
    health_score = max(0, min(100, user_data.get("health_score", 50)))
    strengths = user_data.get("strengths", [])
    weaknesses = user_data.get("weaknesses", [])
    recommendations = user_data.get("recommendations", [])
    sanctuary_state = user_data.get("sanctuary_state", {})
    user_message = sanitize_user_input(
        user_data.get("original_message", user_data.get("user_message", "How am I doing?"))
    )
    intent = user_data.get("classified_intent", "general")
    health_metrics = user_data.get("health_metrics", {})
    sanctuary_influences = user_data.get("sanctuary_influences", {})
    
    print(f"GROQ INTENT: {intent}")
    print(f"GROQ MESSAGE: {user_message}")
    print(f"GROQ HEALTH_SCORE: {health_score}")
    
    sanctuary_data = extract_sanctuary_data(sanctuary_state)
    
    try:
        if intent == "artifact":
            target_artifact = user_data.get("target_artifact", {})
            
            if target_artifact:
                artifact_context = f"""ARTIFACT INFORMATION:

Artifact Name: {target_artifact.get('name', 'Unknown')}
Description: {target_artifact.get('description', 'No description available')}
Unlock Condition: {target_artifact.get('unlock_condition', 'Condition not specified')}
Unlocked: {target_artifact.get('unlocked', False)}
Progress: {target_artifact.get('progress', 'Unknown')}%
Unlock Date: {target_artifact.get('unlock_date', 'Not unlocked yet') if target_artifact.get('unlocked') else 'Not unlocked yet'}"""
            else:
                artifact_context = "ARTIFACT INFORMATION:\n\nNo specific artifact data was provided for this question."
                
            prompt = f"""You are the {companion_type} companion of {user_name}. They asked: "{user_message}"

{artifact_context}

GROUNDING RULES:
- You MUST answer using ONLY the artifact data provided above
- Do NOT invent locations, journeys, events, memories, achievements, or unlocks
- If information is not provided in the data above, explicitly say so
- Do NOT make up progress percentages or unlock conditions

As their {companion_type} companion, respond (2-3 sentences) based ONLY on the provided artifact information."""
        
        elif intent == "sanctuary":
            sanctuary_context = f"""SANCTUARY STATE:

Sky Condition: {sanctuary_data['sky']}
River State: {sanctuary_data['river']}
Forest Condition: {sanctuary_data['forest']}
Weather: {sanctuary_data['weather']}
Season: {sanctuary_data['season']}
Sanctuary Level: {sanctuary_data['level']}

HEALTH INFLUENCES:
{json.dumps(sanctuary_influences, indent=2) if sanctuary_influences else 'No specific health influences data provided'}"""
            
            prompt = f"""You are the {companion_type} companion of {user_name}. They asked: "{user_message}"

{sanctuary_context}

GROUNDING RULES:
- You MUST answer using ONLY the sanctuary data provided above
- Do NOT invent sanctuary features not listed
- If specific information is not provided, say so
- Reference only the actual states shown

As their {companion_type} companion who has witnessed their journey, give a response (2-3 sentences) based ONLY on the provided sanctuary information."""
        
        elif intent == "progress" or "doing" in user_message.lower():
            progress_context = f"""HEALTH PROGRESS DATA:

Overall Health Score: {health_score}/100
Strengths Observed: {', '.join(strengths) if strengths else 'No specific strengths data provided'}
Areas Needing Attention: {', '.join(weaknesses) if weaknesses else 'No specific weakness data provided'}

RECENT METRICS:
Sleep: {health_metrics.get('recent_7_sleep', 'No data')} hours/night (if available)
Hydration: {health_metrics.get('recent_7_water', 'No data')} glasses/day (if available)
Exercise Level: {health_metrics.get('recent_7_exercise', 'No data')} (if available)
Mood: {health_metrics.get('recent_7_mood', 'No data')}/4 (if available)"""
            
            prompt = f"""You are the {companion_type} companion of {user_name}. They asked: "{user_message}"

{progress_context}

GROUNDING RULES:
- You MUST answer using ONLY the health data provided above
- Do NOT invent progress or achievements not shown
- If data shows 'No data', acknowledge the limitation
- Do NOT make up specific numbers or patterns

As their {companion_type} companion, respond (2-3 sentences) based ONLY on the provided progress information."""
        
        elif intent == "health" or any(word in user_message.lower() for word in ["sleep", "water", "exercise", "mood"]):
            health_context = f"""HEALTH DETAILS:

Recent Sleep: {health_metrics.get('recent_7_sleep', 'No sleep data available')} hours nightly
Recent Hydration: {health_metrics.get('recent_7_water', 'No hydration data available')} glasses daily
Exercise Patterns: {health_metrics.get('recent_7_exercise', 'No exercise data available')}
Mood Trends: {health_metrics.get('recent_7_mood', 'No mood data available')}/4

RECOMMENDATIONS:
{chr(10).join(f'- {rec}' for rec in recommendations) if recommendations else 'No specific recommendations provided'}"""
            
            prompt = f"""You are the {companion_type} companion of {user_name}. They asked: "{user_message}"

{health_context}

GROUNDING RULES:
- You MUST answer using ONLY the health data provided above
- Do NOT invent health patterns or trends not shown
- If data is not available, acknowledge this limitation
- Reference only the actual numbers and recommendations provided

As their wise {companion_type} companion, respond (2-3 sentences) based ONLY on the provided health information."""
        
        elif intent == "memories":
            memories_data = user_data.get("memories", [])
            recent_memories = user_data.get("recent_memories", [])
            
            memories_context = f"""MEMORIES DATA:

Total Memories: {len(memories_data)} stored
Recent Memories:
{chr(10).join(f'- {mem.get("title", "Untitled")} ({mem.get("date", "Unknown date")})' for mem in recent_memories[:5]) if recent_memories else 'No recent memories available'}

Memory Details (if specific memory requested):
{json.dumps(user_data.get('target_memory', {}), indent=2) if user_data.get('target_memory') else 'No specific memory data provided'}"""
            
            prompt = f"""You are the {companion_type} companion of {user_name}. They asked: "{user_message}"

{memories_context}

GROUNDING RULES:
- You MUST answer using ONLY the memory data provided above
- Do NOT invent memories, dates, events, or achievements not shown
- If no memory data exists, explicitly say "I don't see that information in your sanctuary yet"
- Reference only actual stored memories

As their remembering {companion_type} companion, respond (2-3 sentences) based ONLY on the provided memory information."""
        
        elif intent == "storybook":
            storybook_data = user_data.get("storybook", {})
            chapters = user_data.get("chapters", [])
            current_chapter = user_data.get("current_chapter", {})
            
            storybook_context = f"""STORYBOOK DATA:

Total Chapters: {len(chapters)}
Current Chapter: {current_chapter.get('title', 'Unknown chapter')}
Chapter Progress: {current_chapter.get('progress', 0)}%

Recent Story Events:
{chr(10).join(f'- {event.get("title", "Event")} ({event.get("date", "Unknown")}): {event.get("description", "No description")[:50]}...' for event in storybook_data.get('recent_events', [])[:3]) if storybook_data.get('recent_events') else 'No recent story events available'}

Story Milestones:
{chr(10).join(f'- {milestone.get("name", "Milestone")}: {milestone.get("achievement", "Unknown")}' for milestone in storybook_data.get('milestones', [])[:3]) if storybook_data.get('milestones') else 'No story milestones available'}"""
            
            prompt = f"""You are the {companion_type} companion of {user_name}. They asked: "{user_message}"

{storybook_context}

GROUNDING RULES:
- You MUST answer using ONLY the storybook data provided above
- Do NOT create fictional story elements not present in the data
- Every story detail must come from the provided events and milestones
- If no storybook data exists, say "I don't see that information in your sanctuary yet"

As their storytelling {companion_type} companion, respond (2-3 sentences) based ONLY on the provided storybook information."""
        
        elif intent == "chronicle":
            chronicle_data = user_data.get("chronicle", {})
            growth_events = user_data.get("growth_events", [])
            lessons_learned = user_data.get("lessons_learned", [])
            milestones = user_data.get("milestones", [])
            
            chronicle_context = f"""CHRONICLE DATA:

Growth Events:
{chr(10).join(f'- {event.get("date", "Unknown")} - {event.get("title", "Event")}: {event.get("impact", "No impact recorded")}' for event in growth_events[:5]) if growth_events else 'No growth events recorded'}

Lessons Learned:
{chr(10).join(f'- {lesson.get("lesson", "Unknown lesson")} (from {lesson.get("context", "unknown context")})' for lesson in lessons_learned[:3]) if lessons_learned else 'No lessons recorded'}

Key Milestones:
{chr(10).join(f'- {milestone.get("date", "Unknown")} - {milestone.get("achievement", "Unknown achievement")}' for milestone in milestones[:5]) if milestones else 'No milestones recorded'}

Journey Duration: {chronicle_data.get('journey_duration', 'Unknown')} days
Total Growth Score: {chronicle_data.get('total_growth', 'Unknown')}"""
            
            prompt = f"""You are the {companion_type} companion of {user_name}. They asked: "{user_message}"

{chronicle_context}

GROUNDING RULES:
- You MUST answer using ONLY the chronicle data provided above
- Do NOT invent growth events, lessons, or milestones not shown
- Use only actual retrieved events and achievements
- If no chronicle data exists, say "I don't see that information in your sanctuary yet"

As their wise {companion_type} companion who has witnessed their entire journey, respond (2-3 sentences) summarizing their actual growth using ONLY the provided chronicle information."""
        
        else:  # general
            general_context = f"""USER CONTEXT:

Name: {user_name}
Companion Type: {companion_type}
Message: {user_message}

SANCTUARY BASICS:
Weather: {sanctuary_data['weather']}
Season: {sanctuary_data['season']}"""
            
            prompt = f"""You are the {companion_type} companion of {user_name}. They said: "{user_message}"

{general_context}

GROUNDING RULES:
- Keep response general and friendly
- Do NOT reference specific health data, achievements, or detailed sanctuary features
- Focus on companionship and support
- Avoid making claims about their progress or journey details

As their caring {companion_type} companion, respond (2-3 sentences) with warm, general friendship."""

        return generate_text_robust(prompt, max_tokens=MAX_RESPONSE_TOKENS)
        
    except Exception as e:
        print(f"Error generating companion response: {e}")
        return "I'm having trouble understanding right now. Could you try asking again?"

def generate_sanctuary_welcome(user_data: Dict[str, Any], companion_type: str = "fox") -> str:
    """Generate sanctuary welcome using Groq AI"""
    
    user_name = user_data.get("user_info", {}).get("name", "Explorer")
    days_logged = user_data.get("days_logged", 0)
    current_streak = user_data.get("current_streak", 0)
    recent_artifacts = user_data.get("recent_artifacts", [])
    
    prompt = f"""You are the {companion_type} companion welcoming {user_name} back to their sanctuary.

Current Journey Stats:
- Days logged: {days_logged}
- Current streak: {current_streak} days
- Recent achievements: {[art.get('name', '') for art in recent_artifacts[:2]]}

Generate a warm, personal welcome (1-2 sentences) that:
- References their actual progress
- Mentions specific achievements if any
- Shows you remember their journey
- Uses {companion_type} personality

Be specific about their journey, not generic."""

    try:
        return generate_text_robust(prompt, max_tokens=200)
    except Exception as e:
        print(f"Error generating welcome: {e}")
        return f"Welcome back to your sanctuary, {user_name}! *tail swishes happily*"

def generate_health_summary(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate comprehensive health summary using Groq AI"""
    
    prompt = f"""Analyze this health data and provide a structured summary:

Health Data: {json.dumps(user_data, indent=2)}

Generate JSON response with:
{{
    "health_score": [0-100 number],
    "strongest_area": "[specific area name]",
    "weakest_area": "[specific area name]", 
    "trend": "[improving/declining/stable]",
    "key_recommendation": "[one specific action]",
    "encouragement": "[personal encouraging message]"
}}

Base all values on the actual data provided. Be specific and accurate."""

    try:
        response_text = generate_text_robust(prompt, max_tokens=MAX_SUMMARY_TOKENS)
        return json.loads(response_text)
    except Exception as e:
        print(f"Error generating health summary: {e}")
        return {
            "health_score": user_data.get("health_score", 50),
            "strongest_area": user_data.get("strengths", ["Awareness"])[0] if user_data.get("strengths") else "Awareness",
            "weakest_area": user_data.get("weaknesses", ["Consistency"])[0] if user_data.get("weaknesses") else "Consistency",
            "trend": "building momentum",
            "key_recommendation": user_data.get("recommendations", ["Continue daily logging"])[0] if user_data.get("recommendations") else "Continue daily logging",
            "encouragement": "You're making progress every day."
        }

def generate_intent_classification(user_message: str) -> str:
    """Classify user message intent"""
    
    prompt = f"""Classify this user message into one of these intents:

Message: "{user_message}"

Intent Options:
- artifact (asking about specific artifacts, unlocks, achievements)
- sanctuary (asking about sanctuary state, environment, conditions)
- progress (asking "how am I doing", progress, scores, improvements)
- health (asking about specific health metrics: sleep, water, exercise, mood)
- memories (asking about past events, memories, history)
- storybook (asking about their story, narrative, chapters)
- chronicle (asking about overall journey, growth, lessons learned)
- general (everything else, casual conversation)

Return only the intent name, nothing else."""

    try:
        return generate_text_robust(prompt, max_tokens=10).lower().strip()
    except Exception:
        return "general"

# Backward compatibility
def generate_text(prompt: str, max_tokens: int = 1024) -> Optional[str]:
    """Backward compatible function - now uses robust generation"""
    try:
        return generate_text_robust(prompt, max_tokens)
    except Exception as e:
        print(f"Groq generation failed: {e}")
        return None

if __name__ == "__main__":
    # Enhanced test suite
    test_data = {
        "user_info": {"name": "TestUser"},
        "classified_intent": "progress",
        "health_score": 67,
        "strengths": ["Hydration", "Exercise"],
        "weaknesses": ["Sleep"],
        "recommendations": ["Get 7-8 hours of sleep nightly"],
        "sanctuary_state": {"weather": "sunny", "season": "spring"},
        "health_metrics": {
            "recent_7_sleep": 6.5,
            "recent_7_water": 8,
            "recent_7_exercise": "moderate",
            "recent_7_mood": 3
        }
    }
    
    print("Testing enhanced Groq service...")
    try:
        response = generate_companion_response(test_data, "fox")
        print(f"✅ Companion Response: {response}")
        
        welcome = generate_sanctuary_welcome(test_data, "fox")
        print(f"✅ Welcome Message: {welcome}")
        
        summary = generate_health_summary(test_data)
        print(f"✅ Health Summary: {summary}")
        
        intent = generate_intent_classification("How am I doing today?")
        print(f"✅ Intent Classification: {intent}")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")