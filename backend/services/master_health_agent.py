"""
Master Health Agent - Primary Intelligence Engine
Analyzes all user data and generates comprehensive health insights.
Only this agent should directly read the database.
"""
import json
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session

from core.models import (
    User, DailyLog, SanctuaryState, ChronicleEntry, 
    MuseumArtifact, Memory, StorybookChapter
)
from services.groq_service_enhanced import generate_text_robust as generate_text
from utils.json_helpers import DailyLogHelper

class MasterHealthAgent:
    """Primary intelligence engine for health analysis"""
    
    def __init__(self, db: Session):
        self.db = db
        self._cache = {}
        self._cache_expiry = {}
    
    def generate_health_summary(self, user_id: int, force_refresh: bool = False) -> Dict[str, Any]:
        """Generate comprehensive health summary - main function for other agents"""
        cache_key = f"health_summary_{user_id}"
        
        # Check cache unless force refresh
        if not force_refresh and self._is_cache_valid(cache_key):
            return self._cache[cache_key]
        
        try:
            summary = self._analyze_user_health(user_id)
            
            # Cache for 30 minutes
            self._cache[cache_key] = summary
            self._cache_expiry[cache_key] = datetime.now() + timedelta(minutes=30)
            
            return summary
            
        except Exception as e:
            print(f"Master Health Agent error: {e}")
            return self._get_fallback_summary(user_id)
    
    def _analyze_user_health(self, user_id: int) -> Dict[str, Any]:
        """Core analysis function"""
        user = self._get_user(user_id)
        if not user:
            raise ValueError("User not found")
        
        # Gather all data
        daily_data = self._get_daily_logs_data(user_id)
        sanctuary_state = self._get_sanctuary_state(user_id)
        artifacts = self._get_artifacts(user_id)
        memories = self._get_recent_memories(user_id)
        chronicles = self._get_recent_chronicles(user_id)
        storybook_chapters = self._get_recent_chapters(user_id)
        
        # Calculate metrics
        health_metrics = self._calculate_health_metrics(daily_data)
        trends = self._calculate_trends(daily_data)
        streaks = self._calculate_streaks(daily_data)
        
        # Generate AI insights
        ai_insights = self._generate_ai_insights(user, health_metrics, trends, artifacts, sanctuary_state)
        
        return {
            "today_summary": ai_insights.get("today_summary", ""),
            "weekly_summary": ai_insights.get("weekly_summary", ""),
            "monthly_summary": ai_insights.get("monthly_summary", ""),
            
            "health_score": health_metrics["overall_score"],
            
            "strengths": ai_insights.get("strengths", []),
            "weaknesses": ai_insights.get("weaknesses", []),
            "recommendations": ai_insights.get("recommendations", []),
            
            "sanctuary_status": ai_insights.get("sanctuary_status", ""),
            
            "recent_artifacts": artifacts,
            "recent_memories": memories,
            "recent_chronicles": chronicles,
            
            "growth_observations": ai_insights.get("growth_observations", []),
            
            # Additional data for other agents
            "raw_metrics": health_metrics,
            "trends": trends,
            "streaks": streaks,
            "sanctuary_state": sanctuary_state,
            "user_info": {
                "name": user.name,
                "companion": user.companion,
                "days_active": len(daily_data)
            }
        }
    
    def _get_user(self, user_id: int) -> Optional[User]:
        """Get user information"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def _get_daily_logs_data(self, user_id: int) -> List[Dict]:
        """Get daily logs data in chronological order"""
        record = self.db.query(DailyLog).filter(DailyLog.user_id == user_id).first()
        if not record or not record.daily_entries:
            return []
        
        daily_data = json.loads(record.daily_entries)
        
        # Convert to list of dicts with date
        logs = []
        for date_str, entry in daily_data.items():
            log_entry = entry.copy()
            log_entry["date"] = date_str
            logs.append(log_entry)
        
        # Sort by date (newest first)
        logs.sort(key=lambda x: x["date"], reverse=True)
        return logs
    
    def _get_sanctuary_state(self, user_id: int) -> Dict:
        """Get sanctuary state"""
        sanctuary = self.db.query(SanctuaryState).filter(
            SanctuaryState.user_id == user_id
        ).first()
        
        if not sanctuary:
            return {}
        
        return {
            "sky": sanctuary.sky,
            "river": sanctuary.river,
            "forest": sanctuary.forest,
            "weather": sanctuary.weather,
            "season": sanctuary.season,
            "animal": sanctuary.animal,
            "expression": sanctuary.expression,
            "level": sanctuary.level,
            "xp": sanctuary.xp,
            "day_count": sanctuary.day_count
        }
    
    def _get_artifacts(self, user_id: int) -> List[Dict]:
        """Get recent unlocked artifacts"""
        artifacts = self.db.query(MuseumArtifact).filter(
            MuseumArtifact.user_id == user_id,
            MuseumArtifact.unlocked == True
        ).order_by(MuseumArtifact.unlock_date.desc()).limit(5).all()
        
        return [{
            "name": artifact.artifact_name,
            "description": artifact.description,
            "unlocked_date": artifact.unlock_date.isoformat() if artifact.unlock_date else None
        } for artifact in artifacts]
    
    def _get_recent_memories(self, user_id: int) -> List[Dict]:
        """Get important recent memories"""
        memories = self.db.query(Memory).filter(
            Memory.user_id == user_id,
            Memory.importance_score >= 6
        ).order_by(Memory.created_at.desc()).limit(5).all()
        
        return [{
            "title": memory.title,
            "summary": memory.summary,
            "type": memory.memory_type,
            "importance": memory.importance_score,
            "date": memory.created_at.isoformat()
        } for memory in memories]
    
    def _get_recent_chronicles(self, user_id: int) -> List[Dict]:
        """Get recent chronicles"""
        chronicles = self.db.query(ChronicleEntry).filter(
            ChronicleEntry.user_id == user_id
        ).order_by(ChronicleEntry.created_at.desc()).limit(3).all()
        
        return [{
            "title": chronicle.title,
            "content": chronicle.content[:100] + "..." if len(chronicle.content) > 100 else chronicle.content,
            "date": chronicle.created_at.isoformat()
        } for chronicle in chronicles]
    
    def _get_recent_chapters(self, user_id: int) -> List[Dict]:
        """Get recent storybook chapters"""
        chapters = self.db.query(StorybookChapter).filter(
            StorybookChapter.user_id == user_id
        ).order_by(StorybookChapter.chapter_number.desc()).limit(3).all()
        
        return [{
            "number": chapter.chapter_number,
            "title": chapter.title,
            "content": chapter.content[:100] + "..." if len(chapter.content) > 100 else chapter.content,
            "date": chapter.created_at.isoformat()
        } for chapter in chapters]
    
    def _calculate_health_metrics(self, daily_data: List[Dict]) -> Dict[str, Any]:
        """Calculate comprehensive health metrics"""
        if not daily_data:
            return {"overall_score": 0}
        
        recent_7_days = daily_data[:7]
        recent_30_days = daily_data[:30]
        
        # Calculate averages for different periods
        metrics = {}
        
        for period_name, period_data in [("recent_7", recent_7_days), ("recent_30", recent_30_days), ("all_time", daily_data)]:
            if period_data:
                metrics[f"{period_name}_sleep"] = sum(log.get("sleep", 0) for log in period_data) / len(period_data)
                metrics[f"{period_name}_water"] = sum(log.get("water", 0) for log in period_data) / len(period_data)
                metrics[f"{period_name}_mood"] = sum(log.get("mood", 0) for log in period_data) / len(period_data)
                
                # Exercise (convert to numeric)
                exercise_vals = []
                for log in period_data:
                    ex = log.get("exercise", 0)
                    if isinstance(ex, str):
                        ex_map = {"none": 0, "light": 1, "moderate": 2, "intense": 3}
                        ex = ex_map.get(ex, 0)
                    exercise_vals.append(ex)
                metrics[f"{period_name}_exercise"] = sum(exercise_vals) / len(exercise_vals)
                
                # Nutrition (convert to numeric)
                nutrition_vals = []
                for log in period_data:
                    nut = log.get("nutrition", 0)
                    if isinstance(nut, str):
                        nut_map = {"poor": 0, "okay": 1, "good": 2, "great": 3}
                        nut = nut_map.get(nut, 0)
                    nutrition_vals.append(nut)
                metrics[f"{period_name}_nutrition"] = sum(nutrition_vals) / len(nutrition_vals)
        
        # Calculate overall health score (0-100)
        if recent_7_days:
            sleep_score = min(100, (metrics["recent_7_sleep"] / 8.0) * 100)
            water_score = min(100, (metrics["recent_7_water"] / 8.0) * 100)
            exercise_score = (metrics["recent_7_exercise"] / 3.0) * 100
            nutrition_score = (metrics["recent_7_nutrition"] / 3.0) * 100
            mood_score = (metrics["recent_7_mood"] / 4.0) * 100
            
            overall_score = int((sleep_score + water_score + exercise_score + nutrition_score + mood_score) / 5)
        else:
            overall_score = 0
        
        metrics["overall_score"] = overall_score
        return metrics
    
    def _calculate_trends(self, daily_data: List[Dict]) -> Dict[str, Any]:
        """Calculate trends comparing recent vs previous periods"""
        if len(daily_data) < 14:
            return {"insufficient_data": True}
        
        recent_7 = daily_data[:7]
        previous_7 = daily_data[7:14]
        
        trends = {}
        
        # Sleep trend
        recent_sleep = sum(log.get("sleep", 0) for log in recent_7) / len(recent_7)
        prev_sleep = sum(log.get("sleep", 0) for log in previous_7) / len(previous_7)
        trends["sleep_change"] = recent_sleep - prev_sleep
        trends["sleep_direction"] = "improving" if recent_sleep > prev_sleep else "declining" if recent_sleep < prev_sleep else "stable"
        
        # Water trend
        recent_water = sum(log.get("water", 0) for log in recent_7) / len(recent_7)
        prev_water = sum(log.get("water", 0) for log in previous_7) / len(previous_7)
        trends["water_change"] = recent_water - prev_water
        trends["water_direction"] = "improving" if recent_water > prev_water else "declining" if recent_water < prev_water else "stable"
        
        # Mood trend
        recent_mood = sum(log.get("mood", 0) for log in recent_7) / len(recent_7)
        prev_mood = sum(log.get("mood", 0) for log in previous_7) / len(previous_7)
        trends["mood_change"] = recent_mood - prev_mood
        trends["mood_direction"] = "improving" if recent_mood > prev_mood else "declining" if recent_mood < prev_mood else "stable"
        
        return trends
    
    def _calculate_streaks(self, daily_data: List[Dict]) -> Dict[str, Any]:
        """Calculate current streaks"""
        if not daily_data:
            return {"current_streak": 0}
        
        # Calculate consecutive logging streak
        streak = 0
        today = date.today()
        expected_date = today
        
        for log in daily_data:
            log_date = datetime.strptime(log["date"], "%Y-%m-%d").date()
            if log_date == expected_date:
                streak += 1
                expected_date = expected_date - timedelta(days=1)
            else:
                break
        
        return {
            "current_streak": streak,
            "is_milestone": streak in [7, 14, 21, 30, 50, 100],
            "next_milestone": next((m for m in [7, 14, 21, 30, 50, 100] if m > streak), None)
        }
    
    def _generate_ai_insights(self, user: User, metrics: Dict, trends: Dict, artifacts: List[Dict], sanctuary_state: Dict) -> Dict[str, Any]:
        """Generate AI-powered insights"""
        
        prompt = f"""Analyze health data for {user.name} with {user.companion} companion.

Health Metrics (0-100 scale):
- Overall Score: {metrics.get('overall_score', 0)}
- Recent 7-day averages: Sleep {metrics.get('recent_7_sleep', 0):.1f}h, Water {metrics.get('recent_7_water', 0):.1f} glasses, Mood {metrics.get('recent_7_mood', 0):.1f}/4

Trends (recent 7 vs previous 7 days):
- Sleep: {trends.get('sleep_direction', 'stable')} ({trends.get('sleep_change', 0):+.1f}h)
- Water: {trends.get('water_direction', 'stable')} ({trends.get('water_change', 0):+.1f} glasses)
- Mood: {trends.get('mood_direction', 'stable')} ({trends.get('mood_change', 0):+.1f} points)

Recent Artifacts: {[a['name'] for a in artifacts[:3]]}
Sanctuary State: {sanctuary_state}

Generate analysis as JSON with these exact keys:
- today_summary: One sentence about today/recent patterns
- weekly_summary: One sentence about weekly patterns and changes  
- monthly_summary: One sentence about longer-term journey
- strengths: Array of 2-3 strongest habits/improvements
- weaknesses: Array of 2-3 areas needing attention
- recommendations: Array of 2-3 specific actionable suggestions
- sanctuary_status: One sentence about how health affects sanctuary
- growth_observations: Array of 2-3 meaningful insights about progress

Focus on specific numbers and be encouraging but honest."""

        try:
            response = generate_text(prompt, max_tokens=800)
            if response:
                # Try to parse as JSON
                if response.strip().startswith('{'):
                    return json.loads(response)
                
                # If not JSON, create fallback structure
                return self._create_fallback_insights(metrics, trends)
        except:
            pass
        
        return self._create_fallback_insights(metrics, trends)
    
    def _create_fallback_insights(self, metrics: Dict, trends: Dict) -> Dict[str, Any]:
        """Create fallback insights when AI generation fails"""
        score = metrics.get("overall_score", 0)
        
        return {
            "today_summary": f"Current health score is {score}/100.",
            "weekly_summary": "Building healthy habits through consistent logging.",
            "monthly_summary": "Your sanctuary journey continues with each mindful choice.",
            "strengths": ["Consistent logging", "Mindful awareness"],
            "weaknesses": ["Sleep optimization", "Hydration consistency"],
            "recommendations": ["Focus on one habit at a time", "Celebrate small improvements"],
            "sanctuary_status": "The sanctuary reflects your growing awareness.",
            "growth_observations": ["Every log contributes to understanding", "Progress happens through consistency"]
        }
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cache is still valid"""
        if cache_key not in self._cache_expiry:
            return False
        return datetime.now() < self._cache_expiry[cache_key]
    
    def _get_fallback_summary(self, user_id: int) -> Dict[str, Any]:
        """Get minimal fallback summary when analysis fails"""
        return {
            "today_summary": "Your sanctuary awaits your next mindful choice.",
            "weekly_summary": "Building awareness through daily reflection.",
            "monthly_summary": "Your journey of growth continues.",
            "health_score": 50,
            "strengths": ["Mindful logging"],
            "weaknesses": ["Consistency"],
            "recommendations": ["Focus on one small improvement"],
            "sanctuary_status": "The sanctuary is ready to grow with you.",
            "recent_artifacts": [],
            "recent_memories": [],
            "recent_chronicles": [],
            "growth_observations": ["Every step matters"],
            "raw_metrics": {"overall_score": 50},
            "trends": {},
            "streaks": {"current_streak": 0},
            "sanctuary_state": {},
            "user_info": {"name": "Explorer", "companion": "fox", "days_active": 0}
        }


# Main function for other services
def get_master_health_analysis(db: Session, user_id: int, force_refresh: bool = False) -> Dict[str, Any]:
    """Get comprehensive health analysis from Master Health Agent"""
    agent = MasterHealthAgent(db)
    return agent.generate_health_summary(user_id, force_refresh)