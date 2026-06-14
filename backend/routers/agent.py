"""
Agent Router - API endpoints for the agentic intelligence layer
"""
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from core.database import get_db
from core.models import User
from services.master_health_agent import get_master_health_analysis
from services.companion_agent import (
    get_sanctuary_welcome,
    get_companion_reflections,
    get_fox_guidance,
    handle_companion_chat
)
from services.storybook_agent import (
    get_latest_story_content,
    generate_manual_chapter
)

router = APIRouter(prefix="/api/agent", tags=["agents"])

# Request/Response Models
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

class HealthSummaryResponse(BaseModel):
    today_summary: str
    weekly_summary: str
    monthly_summary: str
    health_score: int
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str]
    sanctuary_status: str
    growth_observations: list[str]

class CompanionResponse(BaseModel):
    welcome_message: str

class ReflectionResponse(BaseModel):
    today_reflection: str
    weekly_reflection: str
    fox_thoughts: str

class GuidanceResponse(BaseModel):
    health_score: int
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str]
    sanctuary_impact: str

class StoryResponse(BaseModel):
    chapter_number: int
    title: str
    content: str
    created_at: str = None

# Master Health Agent Endpoints
@router.get("/summary/{user_id}", response_model=HealthSummaryResponse)
def get_health_summary(user_id: int, db: Session = Depends(get_db), refresh: bool = False):
    """Get comprehensive health summary from Master Health Agent"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        analysis = get_master_health_analysis(db, user_id, force_refresh=refresh)
        
        return HealthSummaryResponse(
            today_summary=analysis.get("today_summary", ""),
            weekly_summary=analysis.get("weekly_summary", ""),
            monthly_summary=analysis.get("monthly_summary", ""),
            health_score=analysis.get("health_score", 0),
            strengths=analysis.get("strengths", []),
            weaknesses=analysis.get("weaknesses", []),
            recommendations=analysis.get("recommendations", []),
            sanctuary_status=analysis.get("sanctuary_status", ""),
            growth_observations=analysis.get("growth_observations", [])
        )
    except Exception as e:
        print(f"Health summary endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate health summary")

# Companion Agent Endpoints
@router.get("/companion/{user_id}", response_model=CompanionResponse)
def get_companion_dialogue(user_id: int, db: Session = Depends(get_db)):
    """Get Fox companion dialogue for Sanctuary World"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        welcome_message = get_sanctuary_welcome(db, user_id)
        return CompanionResponse(welcome_message=welcome_message)
    except Exception as e:
        print(f"Companion dialogue endpoint error: {e}")
        return CompanionResponse(welcome_message="Welcome back to our sanctuary, Explorer.")

@router.get("/reflection/{user_id}", response_model=ReflectionResponse)
def get_companion_reflection(user_id: int, db: Session = Depends(get_db)):
    """Get companion reflections for Companion Screen"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        reflections = get_companion_reflections(db, user_id)
        return ReflectionResponse(
            today_reflection=reflections.get("today_reflection", "Today holds new possibilities for growth."),
            weekly_reflection=reflections.get("weekly_reflection", "This week has been a step forward."),
            fox_thoughts=reflections.get("fox_thoughts", "I am grateful to witness your journey.")
        )
    except Exception as e:
        print(f"Companion reflection endpoint error: {e}")
        return ReflectionResponse(
            today_reflection="Today holds new possibilities for growth.",
            weekly_reflection="This week has been a step forward.",
            fox_thoughts="I am grateful to witness your journey."
        )

@router.get("/guidance/{user_id}", response_model=GuidanceResponse)
def get_companion_guidance(user_id: int, db: Session = Depends(get_db)):
    """Get AI guidance for Companion Screen"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        guidance = get_fox_guidance(db, user_id)
        return GuidanceResponse(
            health_score=guidance.get("health_score", 50),
            strengths=guidance.get("strengths", ["Mindful awareness"]),
            weaknesses=guidance.get("weaknesses", ["Consistency"]),
            recommendations=guidance.get("recommendations", ["Focus on one small improvement"]),
            sanctuary_impact=guidance.get("sanctuary_impact", "Every choice shapes the sanctuary.")
        )
    except Exception as e:
        print(f"Companion guidance endpoint error: {e}")
        return GuidanceResponse(
            health_score=50,
            strengths=["Mindful awareness"],
            weaknesses=["Consistency"],
            recommendations=["Focus on one small improvement"],
            sanctuary_impact="Every choice shapes the sanctuary."
        )

@router.post("/chat/{user_id}", response_model=ChatResponse)
def chat_with_companion(user_id: int, request: ChatRequest, db: Session = Depends(get_db)):
    """Chat with Fox companion"""
    print(f"🔥 CHAT ENDPOINT HIT - user_id: {user_id}, message: {request.message}")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    try:
        response = handle_companion_chat(db, user_id, request.message)
        return ChatResponse(response=response)
    except Exception as e:
        print(f"Companion chat endpoint error: {e}")
        return ChatResponse(
            response="I'm here with you in this moment, witnessing your journey with gentle eyes."
        )

# Storybook Agent Endpoints
@router.get("/storybook/{user_id}", response_model=StoryResponse | None)
def get_latest_story(user_id: int, db: Session = Depends(get_db)):
    """Get latest generated story content"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        story_content = get_latest_story_content(db, user_id)
        if not story_content:
            return None
        
        return StoryResponse(
            chapter_number=story_content.get("chapter_number", 1),
            title=story_content.get("title", "The Journey Begins"),
            content=story_content.get("content", ""),
            created_at=story_content.get("created_at")
        )
    except Exception as e:
        print(f"Latest story endpoint error: {e}")
        return None

@router.post("/storybook/{user_id}/generate", response_model=StoryResponse | None)
def generate_story_chapter(user_id: int, db: Session = Depends(get_db)):
    """Generate new story chapter on demand"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        new_chapter = generate_manual_chapter(db, user_id)
        if not new_chapter:
            raise HTTPException(status_code=500, detail="Failed to generate chapter")
        
        return StoryResponse(
            chapter_number=new_chapter.get("chapter_number", 1),
            title=new_chapter.get("title", "The Journey Continues"),
            content=new_chapter.get("content", ""),
            created_at=datetime.now().isoformat()
        )
    except Exception as e:
        print(f"Generate story endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate story chapter")

# Agent Status Endpoint
@router.get("/status/{user_id}")
def get_agent_status(user_id: int, db: Session = Depends(get_db)):
    """Get status of all agents for user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # Test all agents
        master_active = False
        companion_active = False
        storybook_active = False
        
        try:
            get_master_health_analysis(db, user_id)
            master_active = True
        except:
            pass
        
        try:
            get_sanctuary_welcome(db, user_id)
            companion_active = True
        except:
            pass
        
        try:
            get_latest_story_content(db, user_id)
            storybook_active = True
        except:
            pass
        
        return {
            "user_id": user_id,
            "user_name": user.name,
            "companion_type": user.companion,
            "agents": {
                "master_health_agent": {
                    "active": master_active,
                    "description": "Primary intelligence engine"
                },
                "companion_agent": {
                    "active": companion_active,
                    "description": "Fox dialogue generator"
                },
                "storybook_agent": {
                    "active": storybook_active,
                    "description": "Narrative generator"
                }
            },
            "system_status": "operational" if all([master_active, companion_active, storybook_active]) else "partial"
        }
    except Exception as e:
        print(f"Agent status endpoint error: {e}")
        return {
            "user_id": user_id,
            "system_status": "error",
            "error": str(e)
        }