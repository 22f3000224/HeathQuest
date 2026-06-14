"""
Simplified Storybook Evolution Service
"""
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from core.models import StorybookChapter

class StorybookEvolution:
    """Generate simple storybook chapters"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def ensure_storybook_record(self, user_id: int) -> StorybookChapter:
        """Ensure user has at least one storybook chapter"""
        storybook_record = self.db.query(StorybookChapter).filter(
            StorybookChapter.user_id == user_id
        ).first()
        
        if not storybook_record:
            storybook_record = StorybookChapter(
                user_id=user_id,
                chapter_number=1,
                title="The Awakening", 
                content="Your sanctuary journey begins with the first steps into transformation..."
            )
            self.db.add(storybook_record)
            self.db.flush()
        
        return storybook_record
    
    def generate_chapter(self, user_id: int, event_type: str, event_data: Dict) -> Optional[Dict]:
        """Generate a new storybook chapter"""
        content = self._get_chapter_content(event_type, event_data)
        if not content:
            return None
            
        # Get next chapter number
        last_chapter = self.db.query(StorybookChapter).filter(
            StorybookChapter.user_id == user_id
        ).order_by(StorybookChapter.chapter_number.desc()).first()
        
        next_number = (last_chapter.chapter_number + 1) if last_chapter else 1
        
        # Create new chapter
        new_chapter = StorybookChapter(
            user_id=user_id,
            chapter_number=next_number,
            title=content["title"],
            content=content["content"]
        )
        self.db.add(new_chapter)
        
        return {
            "chapter_number": next_number,
            "title": content["title"],
            "content": content["content"]
        }
    
    def _get_chapter_content(self, event_type: str, event_data: Dict) -> Optional[Dict]:
        """Get chapter content for event type"""
        if event_type == "artifact_unlock":
            artifact_name = event_data.get("artifact_name", "Artifact")
            return {
                "title": f"The {artifact_name} Manifests",
                "content": f"A new chapter unfolds as the {artifact_name} materializes in your sanctuary."
            }
            
        if event_type == "streak_milestone":
            days = event_data.get("streak_days", 0)
            return {
                "title": f"{days} Days of Dedication",
                "content": f"Your {days}-day journey marks a significant milestone in your transformation."
            }
        
        return None
    
    def get_storybook_state(self, user_id: int) -> Dict:
        """Get user's storybook chapters"""
        self.ensure_storybook_record(user_id)
        
        chapters = self.db.query(StorybookChapter).filter(
            StorybookChapter.user_id == user_id
        ).order_by(StorybookChapter.chapter_number).all()
        
        chapter_list = []
        for chapter in chapters:
            chapter_list.append({
                "id": chapter.id,
                "chapter_number": chapter.chapter_number,
                "title": chapter.title,
                "content": chapter.content,
                "created_at": chapter.created_at.isoformat() if chapter.created_at else None
            })
        
        return {
            "chapters": chapter_list,
            "total_chapters": len(chapter_list)
        }


def generate_storybook_progression(db: Session, user_id: int, event_type: str, event_data: Dict, progression_data: Dict) -> Dict:
    """Generate storybook progression"""
    evolution = StorybookEvolution(db)
    new_chapter = evolution.generate_chapter(user_id, event_type, event_data)
    
    return {
        "new_chapter": new_chapter,
        "chapter_generated": new_chapter is not None
    }


def get_user_storybook(db: Session, user_id: int) -> Dict:
    """Get user's storybook"""
    evolution = StorybookEvolution(db)
    return evolution.get_storybook_state(user_id)