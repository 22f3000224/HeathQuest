"""
Storybook Agent - Narrative Generation
Consumes Master Health Agent output to generate story chapters.
Does NOT read database directly.
"""
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from core.models import StorybookChapter, User
from services.groq_service import generate_text
from services.master_health_agent import get_master_health_analysis

class StorybookAgent:
    """Narrative generator for storybook chapters"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def should_generate_chapter(self, user_id: int, event_type: str, event_data: Dict) -> bool:
        """Determine if a new chapter should be generated"""
        # Only generate chapters for significant events
        significant_events = [
            "artifact_unlock",
            "major_streak_milestone", # 7, 14, 30+ days
            "significant_improvement",
            "sanctuary_evolution"
        ]
        
        if event_type == "artifact_unlock":
            return True
        elif event_type == "streak_milestone":
            streak = event_data.get("streak_days", 0)
            return streak in [7, 14, 21, 30, 50, 100]  # Major milestones only
        elif event_type == "health_improvement":
            # Only for significant improvements (20+ point health score increases)
            return event_data.get("score_increase", 0) >= 20
        elif event_type == "sanctuary_level_up":
            return True
        
        return False
    
    def generate_chapter(self, user_id: int, event_type: str, event_data: Dict) -> Optional[Dict]:
        """Generate a new storybook chapter"""
        if not self.should_generate_chapter(user_id, event_type, event_data):
            return None
        
        try:
            # Get Master Agent analysis
            analysis = get_master_health_analysis(self.db, user_id)
            
            # Get next chapter number
            next_chapter_num = self._get_next_chapter_number(user_id)
            
            # Generate chapter content
            chapter_content = self._generate_chapter_content(
                analysis, event_type, event_data, next_chapter_num
            )
            
            if not chapter_content:
                return None
            
            # Save chapter to database
            new_chapter = StorybookChapter(
                user_id=user_id,
                chapter_number=next_chapter_num,
                title=chapter_content["title"],
                content=chapter_content["content"]
            )
            
            self.db.add(new_chapter)
            self.db.commit()
            
            return {
                "chapter_number": next_chapter_num,
                "title": chapter_content["title"],
                "content": chapter_content["content"],
                "event_type": event_type
            }
            
        except Exception as e:
            print(f"Storybook Agent generation error: {e}")
            return None
    
    def get_latest_chapter_content(self, user_id: int) -> Optional[Dict]:
        """Get latest generated chapter content for display"""
        try:
            latest_chapter = self.db.query(StorybookChapter).filter(
                StorybookChapter.user_id == user_id
            ).order_by(StorybookChapter.chapter_number.desc()).first()
            
            if not latest_chapter:
                return None
            
            return {
                "chapter_number": latest_chapter.chapter_number,
                "title": latest_chapter.title,
                "content": latest_chapter.content,
                "created_at": latest_chapter.created_at.isoformat()
            }
            
        except Exception as e:
            print(f"Storybook Agent latest content error: {e}")
            return None
    
    def generate_on_demand_chapter(self, user_id: int) -> Optional[Dict]:
        """Generate chapter on demand (for manual triggers)"""
        try:
            # Get Master Agent analysis
            analysis = get_master_health_analysis(self.db, user_id)
            
            # Get next chapter number
            next_chapter_num = self._get_next_chapter_number(user_id)
            
            # Generate current journey chapter
            chapter_content = self._generate_journey_summary_chapter(analysis, next_chapter_num)
            
            if not chapter_content:
                return None
            
            # Save chapter to database
            new_chapter = StorybookChapter(
                user_id=user_id,
                chapter_number=next_chapter_num,
                title=chapter_content["title"],
                content=chapter_content["content"]
            )
            
            self.db.add(new_chapter)
            self.db.commit()
            
            return {
                "chapter_number": next_chapter_num,
                "title": chapter_content["title"],
                "content": chapter_content["content"],
                "event_type": "manual_generation"
            }
            
        except Exception as e:
            print(f"Storybook Agent on-demand generation error: {e}")
            return None
    
    def _get_next_chapter_number(self, user_id: int) -> int:
        """Get next chapter number for user"""
        try:
            last_chapter = self.db.query(StorybookChapter).filter(
                StorybookChapter.user_id == user_id
            ).order_by(StorybookChapter.chapter_number.desc()).first()
            
            return (last_chapter.chapter_number + 1) if last_chapter else 1
        except:
            return 1
    
    def _generate_chapter_content(self, analysis: Dict, event_type: str, event_data: Dict, chapter_number: int) -> Optional[Dict]:
        """Generate chapter content based on event and analysis"""
        user_info = analysis.get("user_info", {})
        name = user_info.get("name", "Explorer")
        companion = user_info.get("companion", "fox")
        
        # Prepare context based on event type
        if event_type == "artifact_unlock":
            return self._generate_artifact_chapter(analysis, event_data, chapter_number)
        elif event_type == "streak_milestone":
            return self._generate_milestone_chapter(analysis, event_data, chapter_number)
        elif event_type == "health_improvement":
            return self._generate_improvement_chapter(analysis, event_data, chapter_number)
        elif event_type == "sanctuary_level_up":
            return self._generate_sanctuary_chapter(analysis, event_data, chapter_number)
        
        return None
    
    def _generate_artifact_chapter(self, analysis: Dict, event_data: Dict, chapter_number: int) -> Dict[str, str]:
        """Generate chapter for artifact unlock"""
        user_info = analysis.get("user_info", {})
        name = user_info.get("name", "Explorer")
        companion = user_info.get("companion", "fox")
        
        artifact_name = event_data.get("artifact_name", "Ancient Artifact")
        health_context = analysis.get("today_summary", "")
        sanctuary_state = analysis.get("sanctuary_state", {})
        recent_growth = analysis.get("growth_observations", [])
        
        prompt = f"""Write Chapter {chapter_number} of {name}'s sanctuary story about unlocking the {artifact_name}.

Current context:
- Health summary: {health_context}
- Sanctuary state: {sanctuary_state}
- Recent growth: {recent_growth}
- Companion: {companion}

Write 3 paragraphs in past tense:
1. The moment the {artifact_name} began to manifest in the sanctuary
2. How {name}'s recent choices and growth made this unlock possible
3. The {companion} companion's reaction and what this artifact means for the journey ahead

Title the chapter poetically. Use nature imagery and mystical elements.
Format: Title: [title]

[content]"""

        try:
            response = generate_text(prompt, max_tokens=1000)
            if response:
                return self._parse_chapter_response(response, f"Chapter {chapter_number}: The {artifact_name} Awakens")
        except:
            pass
        
        return {
            "title": f"Chapter {chapter_number}: The {artifact_name} Manifests",
            "content": f"In the gentle light of dawn, the {artifact_name} began to shimmer into existence within {name}'s sanctuary. The {companion} watched with knowing eyes as this precious artifact materialized, a testament to the dedication and care that had been nurtured day by day. With this new addition, the sanctuary hummed with deeper magic, ready to support the journey that lay ahead."
        }
    
    def _generate_milestone_chapter(self, analysis: Dict, event_data: Dict, chapter_number: int) -> Dict[str, str]:
        """Generate chapter for streak milestone"""
        user_info = analysis.get("user_info", {})
        name = user_info.get("name", "Explorer")
        companion = user_info.get("companion", "fox")
        
        streak_days = event_data.get("streak_days", 7)
        weekly_summary = analysis.get("weekly_summary", "")
        strengths = analysis.get("strengths", [])
        
        prompt = f"""Write Chapter {chapter_number} of {name}'s sanctuary story about reaching a {streak_days}-day milestone.

Current journey context:
- Weekly patterns: {weekly_summary}
- Growing strengths: {strengths}
- Companion: {companion}

Write 3 paragraphs in past tense:
1. The significance of {streak_days} consecutive days of mindful attention
2. How the sanctuary has transformed during this time
3. The {companion} companion's reflection on this achievement and the path forward

Title emphasizing the milestone and dedication.
Format: Title: [title]

[content]"""

        try:
            response = generate_text(prompt, max_tokens=800)
            if response:
                return self._parse_chapter_response(response, f"Chapter {chapter_number}: {streak_days} Days of Devotion")
        except:
            pass
        
        return {
            "title": f"Chapter {chapter_number}: {streak_days} Days of Devotion",
            "content": f"For {streak_days} consecutive days, {name} had tended to their sanctuary with unwavering dedication. Each morning brought new intention, each evening offered gentle reflection. The {companion} had witnessed this transformation, noting how consistency had woven itself into the very fabric of the sanctuary's being, creating a rhythm as natural as the turning of seasons."
        }
    
    def _generate_journey_summary_chapter(self, analysis: Dict, chapter_number: int) -> Optional[Dict[str, str]]:
        """Generate a general journey summary chapter"""
        user_info = analysis.get("user_info", {})
        name = user_info.get("name", "Explorer")
        companion = user_info.get("companion", "fox")
        
        health_score = analysis.get("health_score", 50)
        monthly_summary = analysis.get("monthly_summary", "")
        recent_artifacts = analysis.get("recent_artifacts", [])
        sanctuary_state = analysis.get("sanctuary_state", {})
        growth_observations = analysis.get("growth_observations", [])
        
        prompt = f"""Write Chapter {chapter_number} of {name}'s ongoing sanctuary story.

Current state:
- Health score: {health_score}/100
- Journey summary: {monthly_summary}
- Recent achievements: {[a['name'] for a in recent_artifacts[:3]]}
- Sanctuary state: {sanctuary_state}
- Recent insights: {growth_observations}
- Companion: {companion}

Write 3 paragraphs in past tense:
1. The current state of the sanctuary and how it reflects {name}'s journey
2. A meaningful moment or realization from recent growth
3. The {companion} companion's observations and gentle wisdom about what lies ahead

Title the chapter to reflect the current phase of the journey.
Format: Title: [title]

[content]"""

        try:
            response = generate_text(prompt, max_tokens=1000)
            if response:
                return self._parse_chapter_response(response, f"Chapter {chapter_number}: The Continuing Path")
        except:
            pass
        
        return {
            "title": f"Chapter {chapter_number}: The Journey Continues",
            "content": f"As {name} walked through their sanctuary, the {companion} companion noted the subtle changes that marked their shared journey. Each element of the sanctuary told a story of growth, challenge, and gentle persistence. Together, they had learned that transformation happens not in grand gestures, but in the quiet accumulation of mindful choices, day by day, breath by breath."
        }
    
    def _parse_chapter_response(self, response: str, fallback_title: str) -> Dict[str, str]:
        """Parse AI response into title and content"""
        lines = response.strip().split('\n')
        
        if lines and lines[0].lower().startswith('title:'):
            title = lines[0].replace('Title:', '').replace('title:', '').strip()
            content = '\n'.join(lines[1:]).strip()
        else:
            title = fallback_title
            content = response.strip()
        
        return {"title": title, "content": content}


# Public functions for integration
def generate_story_chapter(db: Session, user_id: int, event_type: str, event_data: Dict) -> Optional[Dict]:
    """Generate storybook chapter for event"""
    agent = StorybookAgent(db)
    return agent.generate_chapter(user_id, event_type, event_data)

def get_latest_story_content(db: Session, user_id: int) -> Optional[Dict]:
    """Get latest story content"""
    agent = StorybookAgent(db)
    return agent.get_latest_chapter_content(user_id)

def generate_manual_chapter(db: Session, user_id: int) -> Optional[Dict]:
    """Generate chapter on demand"""
    agent = StorybookAgent(db)
    return agent.generate_on_demand_chapter(user_id)