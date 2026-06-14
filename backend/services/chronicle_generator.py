"""
Enhanced Chronicle Service - Milestone-driven chronicle generation
"""
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from core.models import User, ChronicleEntry
from utils.json_helpers import ChronicleHelper

class ChronicleGenerator:
    """Generate milestone-driven chronicle entries"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def ensure_chronicle_record(self, user_id: int) -> ChronicleEntry:
        """Ensure user has a chronicle record"""
        chronicle_record = self.db.query(ChronicleEntry).filter(
            ChronicleEntry.user_id == user_id
        ).first()
        
        if not chronicle_record:
            chronicle_record = ChronicleEntry(
                user_id=user_id,
                week_number=1,
                chapter_title="Journey Chronicle", 
                title="Beginning",
                content="Your sanctuary journey begins..."
            )
            self.db.add(chronicle_record)
            self.db.flush()
        
        return chronicle_record
    
    def add_chronicle_entry(self, user_id: int, entry_type: str, title: str, description: str, 
                          related_artifact: Optional[str] = None, metadata: Optional[Dict] = None) -> bool:
        """Add a new chronicle entry"""
        chronicle_record = self.db.query(ChronicleEntry).filter(
            ChronicleEntry.user_id == user_id
        ).first()
        
        if not chronicle_record:
            chronicle_record = ChronicleEntry(
                user_id=user_id,
                week_number=1,
                chapter_title=entry_type.replace("_", " ").title(),
                title=title,
                content=description
            )
            self.db.add(chronicle_record)
        else:
            # Update existing record with new entry
            chronicle_record.title = title
            chronicle_record.content = description
            chronicle_record.chapter_title = entry_type.replace("_", " ").title()
        
        return True
    
    def generate_artifact_unlock_entry(self, user_id: int, artifact_key: str, artifact_name: str) -> bool:
        """Generate chronicle entry for artifact unlock"""
        titles = {
            "leaf_chronicle": "The Journey Begins",
            "dream_shard": "Restful Awakening", 
            "aqua_prism": "Crystal Waters Flow",
            "harvest_basket": "Nourishment Gathered",
            "solar_orb": "Solar Energy Captured",
            "spirit_deer": "Harmony Achieved",
            "ancient_grove": "Roots Run Deep",
            "gold_star": "Legendary Status Achieved"
        }
        
        descriptions = {
            "leaf_chronicle": "Your sanctuary journey has begun. The first page of your chronicle fills with the promise of growth and discovery.",
            "dream_shard": "Through dedication to rest, you've crystallized the essence of peaceful sleep. The Dream Shard glows with accumulated tranquility.",
            "aqua_prism": "Your commitment to hydration has formed a prism of pure intention. Each drop of water reflects your growing wisdom.", 
            "harvest_basket": "Mindful nourishment has woven itself into a basket of abundance. Your body and spirit thank you for this care.",
            "solar_orb": "Consistent movement has captured the sun's energy within a radiant orb. Your vitality burns brighter each day.",
            "spirit_deer": "Emotional balance has attracted the sacred Spirit Deer to your sanctuary. Harmony flows through all aspects of your being.",
            "ancient_grove": "Thirty days of dedication have grown into an Ancient Grove. Your habits have taken root and reach toward the sky.",
            "gold_star": "The rarest achievement in the sanctuary. You have transcended ordinary dedication to reach legendary status."
        }
        
        title = titles.get(artifact_key, f"{artifact_name} Unlocked")
        description = descriptions.get(artifact_key, f"You have unlocked the {artifact_name}!")
        
        return self.add_chronicle_entry(
            user_id=user_id,
            entry_type="artifact_unlock",
            title=title,
            description=description,
            related_artifact=artifact_key
        )
    
    def generate_streak_milestone_entry(self, user_id: int, streak_days: int) -> bool:
        """Generate chronicle entry for streak milestones"""
        milestones = {
            7: ("First Week", "Seven days of dedication mark the beginning of true transformation."),
            14: ("Fortnight of Growth", "Two weeks of consistency have strengthened your sanctuary's foundation."),
            21: ("Habit Formation", "Twenty-one days have forged new neural pathways. Change becomes natural."),
            30: ("Month of Mastery", "A full month of dedication demonstrates your commitment to growth."),
            50: ("Halfway to Hundred", "Fifty days of unwavering focus. The finish line draws near."),
            100: ("Centennial Achievement", "One hundred days of dedication. You have achieved legendary consistency.")
        }
        
        if streak_days in milestones:
            title, description = milestones[streak_days]
            return self.add_chronicle_entry(
                user_id=user_id,
                entry_type="streak_milestone", 
                title=title,
                description=description,
                metadata={"streak_days": streak_days}
            )
        
        return False
    
    def generate_sanctuary_evolution_entry(self, user_id: int, level: int) -> bool:
        """Generate chronicle entry for sanctuary level increases"""
        level_titles = {
            2: "First Growth", 
            3: "Expanding Horizons",
            4: "Flourishing Sanctuary",
            5: "Mastery Achieved",
            10: "Legendary Sanctuary"
        }
        
        level_descriptions = {
            2: "Your sanctuary shows its first signs of growth. The environment responds to your care.",
            3: "New areas of your sanctuary begin to flourish. Your influence expands beyond the starting grounds.", 
            4: "The sanctuary thrives under your guidance. Wildlife and nature exist in perfect harmony.",
            5: "Your sanctuary has achieved a state of mastery. Every element works in perfect synchronization.",
            10: "Your sanctuary has become the stuff of legends. Other seekers will tell stories of this place."
        }
        
        if level in level_titles:
            return self.add_chronicle_entry(
                user_id=user_id,
                entry_type="sanctuary_growth",
                title=level_titles[level],
                description=level_descriptions[level],
                metadata={"level": level}
            )
        
        return False
    
    def generate_storybook_milestone_entry(self, user_id: int, book_name: str, chapter_count: int) -> bool:
        """Generate chronicle entry for storybook milestones"""
        return self.add_chronicle_entry(
            user_id=user_id,
            entry_type="storybook_milestone",
            title=f"{book_name} Complete",
            description=f"Your journey through {book_name} reaches completion with {chapter_count} chapters written.",
            metadata={"book": book_name, "chapters": chapter_count}
        )
    
    def get_chronicle_entries(self, user_id: int, limit: int = 20) -> List[Dict]:
        """Get chronicle entries for user"""
        chronicles = self.db.query(ChronicleEntry).filter(
            ChronicleEntry.user_id == user_id
        ).order_by(ChronicleEntry.created_at.desc()).limit(limit).all()
        
        entries = []
        for chronicle in chronicles:
            entries.append({
                "id": chronicle.id,
                "date": chronicle.created_at.isoformat() if chronicle.created_at else None,
                "type": "chronicle_entry",
                "title": chronicle.title,
                "description": chronicle.content,
                "chapter_title": chronicle.chapter_title,
                "week_number": chronicle.week_number
            })
        
        return entries


def generate_progression_chronicles(db: Session, user_id: int, progression_data: Dict) -> List[str]:
    """Generate chronicle entries for progression events"""
    generator = ChronicleGenerator(db)
    entries_created = []
    
    # Generate entries for new artifact unlocks
    if progression_data.get("new_unlocks"):
        for artifact_key in progression_data["new_unlocks"]:
            from services.museum_curator import ARTIFACT_DEFINITIONS
            artifact_name = ARTIFACT_DEFINITIONS[artifact_key]["display_name"]
            
            success = generator.generate_artifact_unlock_entry(user_id, artifact_key, artifact_name)
            if success:
                entries_created.append(f"artifact_unlock_{artifact_key}")
    
    # Generate entries for streak milestones
    if progression_data.get("streak_milestone"):
        streak_days = progression_data["streak_milestone"]
        success = generator.generate_streak_milestone_entry(user_id, streak_days)
        if success:
            entries_created.append(f"streak_{streak_days}")
    
    # Generate entries for sanctuary evolution
    if progression_data.get("sanctuary_level_up"):
        level = progression_data["sanctuary_level_up"]
        success = generator.generate_sanctuary_evolution_entry(user_id, level)
        if success:
            entries_created.append(f"sanctuary_level_{level}")
    
    return entries_created


def get_user_chronicles(db: Session, user_id: int, limit: int = 20) -> List[Dict]:
    """Get chronicle entries for user"""
    generator = ChronicleGenerator(db)
    return generator.get_chronicle_entries(user_id, limit)