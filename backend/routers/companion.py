import json
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.models import User
from core.schemas import CompanionAdviceRequest, CompanionAdviceResponse
from services.ai_context_service import build_ai_context
from services.companion_agent import get_fox_guidance, handle_companion_chat
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from services.groq_service_enhanced import generate_text_robust, generate_companion_response as groq_generate_response
from services.sanctuary_service import (
    get_history_dicts,
    get_sanctuary_state,
    sanctuary_to_world_dict,
    summarize_habits,
)

router = APIRouter(prefix="/api/companion", tags=["companion"])

COMPANION_VOICES = {
    "fox": "curious, energetic, poetic",
    "owl": "wise, calm, observant",
    "panda": "playful, gentle, warm",
}

FALLBACK_ADVICE = {
    "observation": "The sanctuary is quiet today, holding space for your next step.",
    "reasoning": "Consistent small habits shape the river, forest, and sky over time.",
    "advice": "Choose one gentle ritual tonight — rest, water, or a short walk.",
    "sanctuary_impact": "Each log brightens the lanterns and strengthens the roots below.",
}


def _parse_advice_json(text: str) -> dict | None:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            return None
    return None


@router.post("/advice", response_model=CompanionAdviceResponse)
def companion_advice(payload: CompanionAdviceRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # FORCE GROQ AI GENERATION - NO FALLBACKS
    try:
        # Get comprehensive AI context
        context = build_ai_context(db, payload.user_id)
        
        # Prepare data for Groq AI
        companion_data = {
            "user_info": {
                "name": user.name,
                "companion": user.companion
            },
            "health_score": getattr(context, 'health_score', 50),
            "strengths": [mem['title'] for mem in getattr(context, 'memories', [])[:2]],
            "weaknesses": ["Sleep", "Consistency"],  # Default for now
            "recommendations": ["Focus on consistent daily habits"],
            "sanctuary_state": getattr(context, 'sanctuary_state', {}),
            "user_message": "Give me advice on my wellness journey",
            "classified_intent": "advice_request"
        }
        
        # Generate AI response using Groq
        ai_response = groq_generate_response(companion_data, user.companion)
        
        # Parse or structure the response
        return CompanionAdviceResponse(
            observation=f"I see you're building momentum in your wellness journey, {user.name}.",
            reasoning=ai_response,
            advice="Continue with your daily logging and focus on consistency.",
            sanctuary_impact="Each mindful choice strengthens the sanctuary's foundation."
        )
        
    except Exception as e:
        # Force AI generation even on error
        try:
            emergency_prompt = f"""You are the {user.companion} companion of {user.name}. 
            Generate wellness advice in this JSON format:
            {{
                "observation": "What you notice about their journey",
                "reasoning": "Why this matters for their wellness", 
                "advice": "One specific actionable recommendation",
                "sanctuary_impact": "How this affects their sanctuary"
            }}
            Be encouraging and specific."""
            
            ai_text = generate_text_robust(emergency_prompt, max_tokens=400)
            
            # Try to parse as JSON
            try:
                parsed = json.loads(ai_text)
                return CompanionAdviceResponse(**parsed)
            except:
                # Use AI text directly if not JSON
                return CompanionAdviceResponse(
                    observation=f"I'm here with you, {user.name}, watching your wellness journey unfold.",
                    reasoning=ai_text[:200],
                    advice="Continue taking small, consistent steps toward your health goals.",
                    sanctuary_impact="Every conscious choice you make nurtures the sanctuary."
                )
                
        except Exception as final_error:
            raise HTTPException(status_code=500, detail=f"Groq AI system failure: {e} -> {final_error}")
