from datetime import datetime

from sqlalchemy.orm import Session

from core.models import DailyLog, MuseumArtifact
from services.ai_context_service import build_ai_context


ARTIFACT_CATALOG = [
    {
        "artifact_name": "Moonkeeper Relic",
        "description": "Awarded when sleep dedication reaches seven consecutive days.",
        "check": "sleep_streak",
        "threshold": 7,
    },
    {
        "artifact_name": "River Guardian",
        "description": "Awarded when hydration remains strong for five consecutive days.",
        "check": "hydration_streak",
        "threshold": 5,
    },
    {
        "artifact_name": "Forest Elder",
        "description": "Awarded after thirty days of sanctuary logs.",
        "check": "total_logs",
        "threshold": 30,
    },
]


def _sleep_streak(logs: list[DailyLog]) -> int:
    if not logs:
        return 0
    streak = 0
    for log in reversed(logs):
        if log.sleep >= 7:
            streak += 1
        else:
            break
    return streak


def _hydration_streak(logs: list[DailyLog]) -> int:
    if not logs:
        return 0
    streak = 0
    for log in reversed(logs):
        if log.water >= 6:
            streak += 1
        else:
            break
    return streak


def _ensure_catalog_artifacts(db: Session, user_id: int) -> dict[str, MuseumArtifact]:
    existing = {
        a.artifact_name: a
        for a in db.query(MuseumArtifact).filter(MuseumArtifact.user_id == user_id).all()
    }
    for item in ARTIFACT_CATALOG:
        if item["artifact_name"] not in existing:
            artifact = MuseumArtifact(
                user_id=user_id,
                artifact_name=item["artifact_name"],
                description=item["description"],
                unlocked=False,
            )
            db.add(artifact)
            existing[item["artifact_name"]] = artifact
    db.flush()
    return existing


def check_and_unlock_artifacts(db: Session, user_id: int, logs: list[DailyLog]) -> list[str]:
    artifacts = _ensure_catalog_artifacts(db, user_id)
    newly_unlocked: list[str] = []

    sleep_s = _sleep_streak(logs)
    hydration_s = _hydration_streak(logs)
    total = len(logs)

    checks = {
        "sleep_streak": sleep_s,
        "hydration_streak": hydration_s,
        "total_logs": total,
    }

    for item in ARTIFACT_CATALOG:
        name = item["artifact_name"]
        artifact = artifacts[name]
        if artifact.unlocked:
            continue
        if checks[item["check"]] >= item["threshold"]:
            artifact.unlocked = True
            artifact.unlock_date = datetime.utcnow()
            artifact.unlocked_at = datetime.utcnow()
            
            # Generate AI lore for the artifact
            try:
                lore = generate_artifact_lore(db, user_id, name, item)
                artifact.lore = lore
            except Exception as e:
                print(f"Failed to generate lore for {name}: {e}")
                artifact.lore = f"A precious {name.lower()} that holds memories of dedication and growth."
            
            newly_unlocked.append(name)

    db.flush()
    return newly_unlocked


def get_museum_artifacts(db: Session, user_id: int) -> list[MuseumArtifact]:
    _ensure_catalog_artifacts(db, user_id)
    return (
        db.query(MuseumArtifact)
        .filter(MuseumArtifact.user_id == user_id)
        .order_by(MuseumArtifact.id.asc())
        .all()
    )


# ─── Legacy artifact memory (POST /artifact) ──────────────────────────────────

ARTIFACT_CONTEXT = {
    "photo": "a memory of the day the streak began — intimate, specific",
    "journal": "the first full week — a milestone, reflective",
    "relic": "the perfect day when everything aligned — golden, rare",
}


def generate_artifact_lore(db: Session, user_id: int, artifact_name: str, artifact_config: dict) -> str:
    """Generate AI-powered lore for newly unlocked artifacts"""
    from services.groq_service import generate_text
    
    try:
        context = build_ai_context(db, user_id)
        
        # Get relevant memories
        recent_memories = [mem['summary'] for mem in context.memories[:3]]
        
        # Get unlock reason
        unlock_reason = f"Achieved {artifact_config['threshold']} {artifact_config['check'].replace('_', ' ')}"
        
        prompt = f"""Write mystical lore for the artifact "{artifact_name}" in {context.user.name}'s sanctuary.

Unlock reason: {unlock_reason}
Sanctuary companion: {context.user.companion}
Days in sanctuary: {context.days_logged}
Recent memories: {'; '.join(recent_memories) if recent_memories else 'Building new memories'}
Current sanctuary state: {context.sanctuary_state.get('season', 'spring')} season, {context.sanctuary_state.get('weather', 'calm')} weather

Write 1-2 sentences of mystical lore explaining:
1. How this artifact formed in the sanctuary
2. What power or memory it holds

Use sanctuary elements (river, forest, stars, mist). Sound ancient and meaningful."""
        
        lore = generate_text(prompt, max_tokens=300)
        return lore or f"Forged in the heart of the sanctuary, the {artifact_name} remembers every moment of dedication."
        
    except Exception as e:
        print(f"Error generating artifact lore: {e}")
        return f"Born from countless days of care, the {artifact_name} glows with quiet sanctuary magic."


def generate_artifact_memory(artifact: str, log_entry: dict, companion: str, name: str) -> str:

    companion_name = {"fox": "Fox", "owl": "Owl", "panda": "Red Panda"}.get(companion, "Fox")
    prompt = f"""You are {companion_name}, writing a 2-sentence memory inscription for {name}'s sanctuary artifact.

Artifact type: {ARTIFACT_CONTEXT.get(artifact, 'a milestone')}
Data from that day: {log_entry}

Make it feel like reading an old diary entry. Specific. Warm. Brief. No quotes around it."""

    # import here to avoid circular imports at module level
    from services.groq_service import generate_text

    return generate_text(prompt, max_tokens=200) or (
        "This small memory still glows softly in the sanctuary, waiting for the next day to unfold."
    )
