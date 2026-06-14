from datetime import datetime

from sqlalchemy.orm import Session

from core.models import ChronicleEntry, User
from services.groq_service import generate_text
from services.sanctuary_service import sanctuary_to_world_dict, summarize_habits


FALLBACK_CHRONICLE = (
    "The sanctuary kept its quiet rhythm today, and every small step "
    "left a softer trace in the trees and river."
)


def generate_chronicle_title(log: dict, world: dict) -> str:
    season = world.get("season", "spring")
    mood = log.get("mood", 3)
    if mood >= 4:
        return f"A Bright {season.capitalize()} Day"
    if mood <= 2:
        return f"Quiet {season.capitalize()} Evening"
    return f"Chronicle of the {season.capitalize()} Path"


def build_chronicle_prompt(name: str, log: dict, world: dict, companion: str) -> str:
    companion_name = {"fox": "Fox", "owl": "Owl", "panda": "Red Panda"}.get(companion, "Fox")
    return f"""
Write a short sanctuary chronicle for {name}.

Companion:
{companion_name}

Today's data:

Sleep: {log.get('sleep')}
Water: {log.get('water')}
Exercise: {log.get('exercise')}
Nutrition: {log.get('nutrition')}
Mood: {log.get('mood')}

Sanctuary state:

Sky: {world.get('sky')}
River: {world.get('river')}
Forest: {world.get('forest')}
Weather: {world.get('weather')}
Season: {world.get('season')}

IMPORTANT RULES:

1. Never contradict the supplied values.
2. Sleep and water values must directly influence the narrative.
3. High hydration should never be described as drought.
4. High sleep should never be described as exhaustion.
5. Low mood may affect weather.
6. Good nutrition should improve forest descriptions.
7. Base all descriptions on the provided data.
8. Use nature metaphors only after interpreting the data.

Write 3-4 sentences.

Narrative style:
Fantasy sanctuary journal.

Reasoning first.
Creativity second.
Accuracy is mandatory.
"""


def create_chronicle_for_log(
    db: Session,
    user: User,
    log: dict,
    sanctuary_state,
) -> ChronicleEntry:
    world = sanctuary_to_world_dict(sanctuary_state)
    prompt = build_chronicle_prompt(user.name, log, world, user.companion)
    content = generate_text(prompt, max_tokens=400) or FALLBACK_CHRONICLE
    title = generate_chronicle_title(log, world)

    entry = ChronicleEntry(
        user_id=user.id,
        title=title,
        content=content,
        created_at=datetime.utcnow(),
    )
    db.add(entry)
    db.flush()
    return entry


def get_chronicles(db: Session, user_id: int) -> list[ChronicleEntry]:
    return (
        db.query(ChronicleEntry)
        .filter(ChronicleEntry.user_id == user_id)
        .order_by(ChronicleEntry.created_at.desc())
        .all()
    )


# ─── Legacy weekly chronicle (POST /chronicle) ─────────────────────────────────

def generate_weekly_chronicle(week_data: list, companion: str, name: str) -> str:
    companion_name = {"fox": "Fox", "owl": "Owl", "panda": "Red Panda"}.get(companion, "Fox")
    summary = summarize_habits(week_data)
    prompt = f"""You are writing the weekly reflection for {name}'s sanctuary, narrated by the {companion_name}.

This week summary:
- Best habit: {summary['strongest_habit']}
- Biggest challenge: {summary['weakest_habit']}
- Trend: {summary['trend']}
- Averages: {summary['averages']}
- Raw week data: {week_data}

Write a 3-part reflection in clear prose:
1. Best Habit: explain what improved most this week.
2. Biggest Challenge: explain what still needs attention.
3. Focus Next Week: give one gentle recommendation and a hopeful closing.

Keep it grounded in the actual data and use sanctuary imagery only after the analysis."""

    return generate_text(prompt, max_tokens=1200) or (
        f"Best Habit: {summary['strongest_habit']}. Biggest Challenge: {summary['weakest_habit']}. "
        f"Trend: {summary['trend']}. Focus Next Week: keep the sanctuary steady with small, consistent habits."
    )


def get_recent_chronicles(db: Session, user_id: int, limit: int = 5) -> list[ChronicleEntry]:
    """Get recent chronicle entries for a user"""
    return (
        db.query(ChronicleEntry)
        .filter(ChronicleEntry.user_id == user_id)
        .order_by(ChronicleEntry.created_at.desc())
        .limit(limit)
        .all()
    )
