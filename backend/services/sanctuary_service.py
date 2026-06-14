from datetime import date
from typing import Optional
import json

from sqlalchemy.orm import Session

from utils.analyzer import calculate_world_state
from core.models import DailyLog, SanctuaryState, User


NUTRITION_LEVEL = {"poor": 1, "okay": 2, "good": 3, "great": 4}
EXERCISE_SCORE = {"none": 0, "light": 1, "moderate": 2, "intense": 3}
NUTRITION_SCORE = {"poor": 0, "okay": 1, "good": 2, "great": 3}


def ensure_user(db: Session, user_id: int, name: str = "Explorer") -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        user = User(id=user_id, name=name)
        db.add(user)
        db.flush()
    return user


def log_to_dict(log: DailyLog) -> dict:
    """Convert DailyLog JSON structure to dict for the most recent entry"""
    try:
        entries = json.loads(log.daily_entries) if log.daily_entries else {}
        if entries:
            # Get the most recent entry
            latest_date = max(entries.keys())
            latest_entry = entries[latest_date]
            return {
                "sleep": latest_entry.get("sleep", 0),
                "water": latest_entry.get("water", 0),
                "exercise": latest_entry.get("exercise", "none"),
                "nutrition": latest_entry.get("nutrition", "okay"),
                "mood": latest_entry.get("mood", 0),
                "date": latest_date,
            }
    except (json.JSONDecodeError, AttributeError, ValueError):
        pass
    
    # Return default values if no data
    return {
        "sleep": 0,
        "water": 0,
        "exercise": "none",
        "nutrition": "okay",
        "mood": 0,
        "date": date.today().isoformat(),
    }


def get_user_logs(db: Session, user_id: int) -> list[DailyLog]:
    return (
        db.query(DailyLog)
        .filter(DailyLog.user_id == user_id)
        .order_by(DailyLog.created_at.asc())
        .all()
    )


def get_history_dicts(db: Session, user_id: int, exclude_today: bool = False) -> list[dict]:
    logs = get_user_logs(db, user_id)
    today_str = date.today().isoformat()
    history = []
    
    for log in logs:
        try:
            entries = json.loads(log.daily_entries) if log.daily_entries else {}
            for date_str, entry_data in entries.items():
                if exclude_today and date_str == today_str:
                    continue
                history.append({
                    "sleep": entry_data.get("sleep", 0),
                    "water": entry_data.get("water", 0),
                    "exercise": entry_data.get("exercise", "none"),
                    "nutrition": entry_data.get("nutrition", "okay"),
                    "mood": entry_data.get("mood", 0),
                    "date": date_str,
                })
        except (json.JSONDecodeError, AttributeError):
            continue
    
    # Sort by date
    history.sort(key=lambda x: x["date"])
    return history


def _levels_from_log(log: dict) -> tuple[int, int, int, int]:
    crystal = min(4, max(0, int(log.get("sleep", 0)) // 2))
    river = min(4, max(0, int(log.get("water", 0)) // 2))
    forest = NUTRITION_LEVEL.get(log.get("nutrition", "okay"), 2)
    lantern = min(4, max(1, int(log.get("mood", 2))))
    return crystal, river, forest, lantern


def calculate_xp_awarded(log: dict) -> int:
    xp = 0
    if log.get("sleep", 0) >= 8:
        xp += 20
    if log.get("water", 0) >= 6:
        xp += 20
    if log.get("exercise", "none") in ("moderate", "intense"):
        xp += 20
    if log.get("nutrition", "poor") in ("good", "great"):
        xp += 20
    if log.get("mood", 0) >= 1:
        xp += 10
    return xp


def calculate_level(xp: int) -> int:
    return min(5, (xp // 100) + 1)


def calculate_next_level_xp(level: int) -> int:
    return level * 100


def summarize_habits(history: list[dict]) -> dict:
    if not history:
        return {
            "strongest_habit": "Hydration",
            "weakest_habit": "Mood",
            "trend": "No history yet; start logging to unlock guidance.",
            "averages": {},
        }

    averages = {
        "sleep": round(sum(item.get("sleep", 0) for item in history) / len(history), 1),
        "water": round(sum(item.get("water", 0) for item in history) / len(history), 1),
        "mood": round(sum(item.get("mood", 0) for item in history) / len(history), 1),
        "exercise": round(sum(EXERCISE_SCORE.get(item.get("exercise", "none"), 0) for item in history) / len(history), 2),
        "nutrition": round(sum(NUTRITION_SCORE.get(item.get("nutrition", "okay"), 0) for item in history) / len(history), 2),
    }

    strongest = max(averages, key=lambda key: averages[key])
    weakest = min(averages, key=lambda key: averages[key])
    strongest_label = {"sleep": "Sleep", "water": "Hydration", "mood": "Mood", "exercise": "Exercise", "nutrition": "Nutrition"}[strongest]
    weakest_label = {"sleep": "Sleep", "water": "Hydration", "mood": "Mood", "exercise": "Exercise", "nutrition": "Nutrition"}[weakest]

    return {
        "strongest_habit": strongest_label,
        "weakest_habit": weakest_label,
        "trend": "Mood is trending upward" if averages["mood"] >= 2.5 else "Mood remains the main risk to watch.",
        "averages": averages,
    }


def apply_world_state(db: Session, user_id: int, today: dict, history: list[dict]) -> SanctuaryState:
    world = calculate_world_state(today, history)
    crystal, river_lvl, forest_lvl, lantern = _levels_from_log(today)
    day_count = len(history) + 1

    state = db.query(SanctuaryState).filter(SanctuaryState.user_id == user_id).first()
    if state is None:
        state = SanctuaryState(user_id=user_id)
        db.add(state)

    # Don't recalculate XP here - it should be handled by xp_calculator service
    # Only update world visual state
    state.sky = world["sky"]
    state.river = world["river"]
    state.forest = world["forest"]
    state.weather = world["weather"]
    state.season = world["season"]
    state.animal = world["animal"]
    state.expression = world["expression"]
    state.crystal_level = crystal
    state.river_level = river_lvl
    state.forest_level = forest_lvl
    state.lantern_level = lantern
    state.day_count = day_count

    db.flush()
    return state


def get_sanctuary_state(db: Session, user_id: int) -> Optional[SanctuaryState]:
    return db.query(SanctuaryState).filter(SanctuaryState.user_id == user_id).first()


def default_sanctuary_state(user_id: int) -> SanctuaryState:
    return SanctuaryState(
        user_id=user_id,
        sky="cloudy",
        river="low",
        forest="sparse",
        weather="overcast",
        season="spring",
        animal="resting",
        expression="calm",
        crystal_level=0,
        river_level=0,
        forest_level=0,
        lantern_level=0,
        day_count=0,
        xp=0,
        level=1,
        next_level_xp=100,
        xp_awarded_today=0,
    )


def sanctuary_to_world_dict(state: SanctuaryState) -> dict:
    return {
        "sky": state.sky,
        "river": state.river,
        "animal": state.animal,
        "forest": state.forest,
        "weather": state.weather,
        "season": state.season,
        "expression": state.expression,
    }

def calculate_wellness_score(log: dict) -> int:
    sleep_score = min(log.get("sleep", 0), 8) * 10
    water_score = min(log.get("water", 0), 8) * 10
    exercise_score = EXERCISE_SCORE.get(log.get("exercise", "none"), 0) * 20
    nutrition_score = NUTRITION_SCORE.get(log.get("nutrition", "okay"), 0) * 20
    mood_score = log.get("mood", 0) * 25

    return sleep_score + water_score + exercise_score + nutrition_score + mood_score

