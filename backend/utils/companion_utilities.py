#!/usr/bin/env python3
"""
Companion Utilities for HealthQuest AI
Additional helper functions for the enhanced companion system
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json

def create_sample_user_data(name: str = "Explorer") -> Dict[str, Any]:
    """Create sample user data for testing"""
    return {
        "user_info": {"name": name},
        "classified_intent": "general",
        "health_score": 65,
        "strengths": ["Consistency", "Hydration"],
        "weaknesses": ["Sleep Quality"],
        "recommendations": ["Establish a regular sleep schedule", "Continue daily water tracking"],
        "sanctuary_state": {
            "sky": "clear",
            "river": "flowing",
            "forest": "lush",
            "weather": "sunny",
            "season": "spring",
            "level": 3
        },
        "health_metrics": {
            "recent_7_sleep": 7.2,
            "recent_7_water": 8.5,
            "recent_7_exercise": "moderate",
            "recent_7_mood": 3.4
        },
        "sanctuary_influences": {
            "sleep_impact": "positive",
            "hydration_impact": "very_positive",
            "exercise_impact": "moderate",
            "mood_impact": "positive"
        },
        "days_logged": 45,
        "current_streak": 12,
        "memories": [
            {
                "title": "First Week Complete",
                "date": "2024-01-07",
                "description": "Successfully logged health data for a full week"
            },
            {
                "title": "Hydration Goal Achieved",
                "date": "2024-01-15",
                "description": "Reached daily water intake goal consistently"
            }
        ],
        "recent_artifacts": [
            {
                "name": "Crystal of Clarity",
                "unlocked": True,
                "unlock_date": "2024-01-15"
            }
        ]
    }

def validate_companion_type(companion_type: str) -> str:
    """Validate and return valid companion type"""
    valid_companions = {
        'fox': 'Fox',
        'owl': 'Owl', 
        'deer': 'Deer',
        'wolf': 'Wolf',
        'rabbit': 'Rabbit'
    }
    
    normalized = companion_type.lower().strip()
    return valid_companions.get(normalized, 'Fox')

def extract_health_trends(health_metrics: Dict[str, Any]) -> Dict[str, str]:
    """Extract health trends from metrics"""
    trends = {}
    
    # Sleep trend
    sleep_hours = health_metrics.get('recent_7_sleep', 0)
    if isinstance(sleep_hours, (int, float)):
        if sleep_hours >= 7.5:
            trends['sleep'] = 'excellent'
        elif sleep_hours >= 6.5:
            trends['sleep'] = 'good'
        elif sleep_hours >= 5.5:
            trends['sleep'] = 'needs_improvement'
        else:
            trends['sleep'] = 'concerning'
    else:
        trends['sleep'] = 'unknown'
    
    # Hydration trend
    water_glasses = health_metrics.get('recent_7_water', 0)
    if isinstance(water_glasses, (int, float)):
        if water_glasses >= 8:
            trends['hydration'] = 'excellent'
        elif water_glasses >= 6:
            trends['hydration'] = 'good'
        elif water_glasses >= 4:
            trends['hydration'] = 'needs_improvement'
        else:
            trends['hydration'] = 'concerning'
    else:
        trends['hydration'] = 'unknown'
    
    # Mood trend
    mood_score = health_metrics.get('recent_7_mood', 0)
    if isinstance(mood_score, (int, float)):
        if mood_score >= 3.5:
            trends['mood'] = 'excellent'
        elif mood_score >= 2.5:
            trends['mood'] = 'good'
        elif mood_score >= 1.5:
            trends['mood'] = 'needs_improvement'
        else:
            trends['mood'] = 'concerning'
    else:
        trends['mood'] = 'unknown'
    
    return trends

def generate_sanctuary_description(sanctuary_data: Dict[str, str], health_trends: Dict[str, str]) -> str:
    """Generate a narrative sanctuary description based on health trends"""
    
    descriptions = {
        'sky': {
            'excellent': 'brilliant azure with wisps of silver clouds',
            'good': 'clear blue with gentle cloud formations', 
            'needs_improvement': 'partly cloudy with patches of sunlight',
            'concerning': 'overcast with heavy gray clouds',
            'unknown': 'mysterious and ever-changing'
        },
        'river': {
            'excellent': 'crystal clear waters flowing with vitality',
            'good': 'clean, steady flow with gentle ripples',
            'needs_improvement': 'flowing but somewhat murky',
            'concerning': 'sluggish with stagnant pools',
            'unknown': 'meandering through misty banks'
        },
        'forest': {
            'excellent': 'vibrant green canopy with abundant life',
            'good': 'healthy trees with dappled sunlight',
            'needs_improvement': 'mixed growth with some bare patches',
            'concerning': 'sparse vegetation and wilted leaves',
            'unknown': 'shrouded in morning fog'
        }
    }
    
    # Map health trends to sanctuary elements
    sleep_trend = health_trends.get('sleep', 'unknown')
    hydration_trend = health_trends.get('hydration', 'unknown')
    mood_trend = health_trends.get('mood', 'unknown')
    
    sky_desc = descriptions['sky'].get(sleep_trend, descriptions['sky']['unknown'])
    river_desc = descriptions['river'].get(hydration_trend, descriptions['river']['unknown'])
    forest_desc = descriptions['forest'].get(mood_trend, descriptions['forest']['unknown'])
    
    return f"Your sanctuary shows a {sky_desc} above a {river_desc}, surrounded by a {forest_desc}."

def create_artifact_progress(user_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Create artifact progress based on user health data"""
    
    health_score = user_data.get('health_score', 50)
    health_trends = extract_health_trends(user_data.get('health_metrics', {}))
    
    artifacts = []
    
    # Sleep-based artifact
    if health_trends.get('sleep') in ['excellent', 'good']:
        artifacts.append({
            'name': 'Moonstone of Rest',
            'unlocked': True,
            'progress': 100,
            'description': 'A glowing stone that represents mastery of restful sleep',
            'unlock_condition': 'Maintain good sleep for 7 days',
            'unlock_date': datetime.now().strftime('%Y-%m-%d')
        })
    elif health_trends.get('sleep') == 'needs_improvement':
        artifacts.append({
            'name': 'Moonstone of Rest',
            'unlocked': False,
            'progress': 60,
            'description': 'A glowing stone that represents mastery of restful sleep',
            'unlock_condition': 'Maintain good sleep for 7 days'
        })
    
    # Hydration-based artifact
    if health_trends.get('hydration') in ['excellent', 'good']:
        artifacts.append({
            'name': 'Crystal of Flowing Waters',
            'unlocked': True,
            'progress': 100,
            'description': 'A clear crystal that embodies perfect hydration',
            'unlock_condition': 'Drink 8+ glasses daily for 5 days',
            'unlock_date': datetime.now().strftime('%Y-%m-%d')
        })
    
    # Overall progress artifact
    if health_score >= 80:
        artifacts.append({
            'name': 'Orb of Wellness Mastery',
            'unlocked': True,
            'progress': 100,
            'description': 'The ultimate artifact representing complete wellness harmony',
            'unlock_condition': 'Achieve 80+ health score',
            'unlock_date': datetime.now().strftime('%Y-%m-%d')
        })
    elif health_score >= 60:
        artifacts.append({
            'name': 'Orb of Wellness Mastery',
            'unlocked': False,
            'progress': int((health_score - 50) * 2),
            'description': 'The ultimate artifact representing complete wellness harmony',
            'unlock_condition': 'Achieve 80+ health score'
        })
    
    return artifacts

def format_companion_personality(companion_type: str) -> Dict[str, str]:
    """Get personality traits for different companion types"""
    
    personalities = {
        'fox': {
            'traits': 'clever, observant, encouraging',
            'speech_style': 'wise and playful',
            'gestures': ['*ears perk up*', '*tail swishes thoughtfully*', '*bright eyes gleam*'],
            'approach': 'offers insights through gentle observation'
        },
        'owl': {
            'traits': 'wise, patient, analytical',
            'speech_style': 'measured and thoughtful',
            'gestures': ['*hoots softly*', '*tilts head*', '*ruffles feathers*'],
            'approach': 'provides deep wisdom and careful analysis'
        },
        'deer': {
            'traits': 'gentle, graceful, intuitive',
            'speech_style': 'soft and nurturing',
            'gestures': ['*ears twitch*', '*steps gracefully*', '*nods gently*'],
            'approach': 'offers comfort and emotional support'
        },
        'wolf': {
            'traits': 'loyal, protective, encouraging',
            'speech_style': 'direct and supportive',
            'gestures': ['*howls softly*', '*paces thoughtfully*', '*eyes gleam*'],
            'approach': 'provides strong motivation and pack mentality'
        },
        'rabbit': {
            'traits': 'energetic, optimistic, detail-oriented',
            'speech_style': 'quick and enthusiastic',
            'gestures': ['*hops excitedly*', '*nose twitches*', '*ears perk up*'],
            'approach': 'brings energy and focuses on small wins'
        }
    }
    
    return personalities.get(companion_type.lower(), personalities['fox'])

def create_memory_entry(title: str, description: str, impact: str = "positive") -> Dict[str, Any]:
    """Create a properly formatted memory entry"""
    
    return {
        'title': title,
        'description': description,
        'date': datetime.now().strftime('%Y-%m-%d'),
        'impact': impact,
        'type': 'achievement' if impact == 'positive' else 'reflection',
        'sanctuary_state_at_time': {
            'weather': 'recorded',
            'season': 'growth'
        }
    }

def calculate_wellness_momentum(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate momentum and trajectory"""
    
    current_streak = user_data.get('current_streak', 0)
    days_logged = user_data.get('days_logged', 0)
    health_score = user_data.get('health_score', 50)
    
    # Calculate momentum based on consistency and progress
    if current_streak >= 14:
        momentum = 'high'
    elif current_streak >= 7:
        momentum = 'building'
    elif current_streak >= 3:
        momentum = 'gaining'
    else:
        momentum = 'starting'
    
    # Calculate trajectory
    if health_score >= 75:
        trajectory = 'thriving'
    elif health_score >= 60:
        trajectory = 'improving'
    elif health_score >= 45:
        trajectory = 'building'
    else:
        trajectory = 'beginning'
    
    return {
        'momentum': momentum,
        'trajectory': trajectory,
        'consistency_score': min(100, (current_streak / 30) * 100),
        'engagement_level': min(100, (days_logged / 60) * 100)
    }

if __name__ == "__main__":
    # Test the utilities
    test_data = create_sample_user_data("TestUser")
    print("✅ Sample user data created")
    
    trends = extract_health_trends(test_data['health_metrics'])
    print(f"✅ Health trends: {trends}")
    
    sanctuary_desc = generate_sanctuary_description(test_data['sanctuary_state'], trends)
    print(f"✅ Sanctuary description: {sanctuary_desc}")
    
    artifacts = create_artifact_progress(test_data)
    print(f"✅ Generated {len(artifacts)} artifacts")
    
    momentum = calculate_wellness_momentum(test_data)
    print(f"✅ Wellness momentum: {momentum}")
    
    personality = format_companion_personality('fox')
    print(f"✅ Fox personality: {personality['traits']}")