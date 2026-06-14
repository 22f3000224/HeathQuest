import json
import re

from core.models import User
from services.groq_service import generate_text
from services.sanctuary_service import get_history_dicts, summarize_habits


FALLBACK_ADVISOR = {
    "strongest_habit": "Hydration",
    "biggest_risk": "Mood",
    "prediction": "The sanctuary will stay steady if daily habits remain consistent.",
    "recommended_focus": "Protect emotional wellbeing while keeping hydration and sleep strong.",
    "reasoning": "Your strongest habits are already supporting the sanctuary, but the weakest area still needs gentle attention.",
}


def _parse_json(text: str) -> dict | None:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return None


def generate_advisor_summary(db, user_id: int) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        return FALLBACK_ADVISOR

    history = get_history_dicts(db, user_id)
    recent = history[-7:] if history else []
    summary = summarize_habits(recent)

    prompt = f"""
You are the Sanctuary Advisor for {user.name}.

Use only the 7-day history below.
Strongest habit: {summary['strongest_habit']}
Weakest habit: {summary['weakest_habit']}
Trend: {summary['trend']}
Averages: {summary['averages']}
Recent logs: {recent}

Return ONLY valid JSON with exactly these keys:
- strongest_habit
- biggest_risk
- prediction
- recommended_focus
- reasoning

Rules:
1. Never invent data.
2. Base the prediction on the actual averages.
3. Keep the recommendation practical and gentle.
4. Explain the reasoning in 1-2 sentences.
"""

    raw = generate_text(prompt, max_tokens=500)
    parsed = _parse_json(raw) if raw else None

    if parsed and all(k in parsed for k in FALLBACK_ADVISOR):
        return {
            "strongest_habit": str(parsed.get("strongest_habit", summary["strongest_habit"])).strip(),
            "biggest_risk": str(parsed.get("biggest_risk", summary["weakest_habit"])).strip(),
            "prediction": str(parsed.get("prediction", "The sanctuary will remain steady if habits stay consistent.")).strip(),
            "recommended_focus": str(parsed.get("recommended_focus", "Protect your weakest habit with one small daily action.")).strip(),
            "reasoning": str(parsed.get("reasoning", "The strongest habit supports growth while the weakest area still needs attention.")).strip(),
        }

    return {
        "strongest_habit": summary["strongest_habit"],
        "biggest_risk": summary["weakest_habit"],
        "prediction": f"If the current pattern continues, the sanctuary will stay {('calm' if summary['trend'] else 'steady')}.",
        "recommended_focus": f"Keep building {summary['strongest_habit'].lower()} while gently supporting {summary['weakest_habit'].lower()}.",
        "reasoning": "The recent averages show the strongest habit is carrying the sanctuary forward, while the weakest habit remains the main risk to watch.",
    }
