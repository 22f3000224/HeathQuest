import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

load_dotenv()

from utils.analyzer import calculate_world_state
from core.database import get_db, init_db
from core.schemas import (
    AnalyzeRequest,
    ArtifactRequest,
    ChronicleRequest,
    NarrationRequest,
    SanctuaryStateResponse,
    StoryRequest,
)
from services.chronicle_service import generate_weekly_chronicle
from services.groq_service_enhanced import generate_text_robust as generate_text
from services.museum_service import generate_artifact_memory
from services.sanctuary_service import get_sanctuary_state

from routers import advisor as advisor_router
from routers import agent as agent_router
from routers import auth as auth_router
from routers import chronicle as chronicle_router
from routers import companion as companion_router
from routers import context as context_router
from routers import logs as logs_router
from routers import memories as memories_router
from routers import museum as museum_router
from routers import reflection as reflection_router
from routers import sanctuary as sanctuary_router
from routers import storybook as storybook_router
from routers import progression as progression_router
from routers import users as users_router

app = FastAPI(title="HealthQuest API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",  # Frontend_new
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",  # Alternative localhost
        "*"  # Allow all origins for testing
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(auth_router.router)
app.include_router(agent_router.router)
app.include_router(users_router.router)
app.include_router(progression_router.router)
app.include_router(logs_router.router)  # Remove /api prefix since router already has it
app.include_router(companion_router.router)
app.include_router(chronicle_router.router)
app.include_router(museum_router.router)
app.include_router(advisor_router.router)
app.include_router(reflection_router.router)
app.include_router(memories_router.router)
app.include_router(context_router.router)
app.include_router(storybook_router.router)
app.include_router(sanctuary_router.router)

# Compatibility: top-level advisor and reflection endpoints to match older frontend calls
from services.advisor_service import generate_advisor_summary
from services.sanctuary_service import get_history_dicts


@app.get("/advisor/{user_id}")
def advisor_legacy(user_id: int, db: Session = Depends(get_db)):
    # reuse service used by /api/advisor/{user_id}
    return generate_advisor_summary(db, user_id)


@app.get("/reflection/{user_id}")
def reflection_legacy(user_id: int, db: Session = Depends(get_db)):
    # produce the same shaped response as /api/reflection/{user_id}
    from core.models import User

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    history = get_history_dicts(db, user_id)
    recent = history[-7:] if history else []
    text = generate_weekly_chronicle(recent, user.companion, user.name)
    return {"reflection": text}


@app.on_event("startup")
def on_startup():
    init_db()


# ─── Sanctuary state ──────────────────────────────────────────────────────────

@app.get("/sanctuary/{user_id}", response_model=SanctuaryStateResponse)
def get_sanctuary(user_id: int, db: Session = Depends(get_db)):
    state = get_sanctuary_state(db, user_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Sanctuary state not found for user")
    return SanctuaryStateResponse.model_validate(state)


# ─── Legacy endpoints (frontend-compatible) ─────────────────────────────────────

COMPANION_VOICES = {
    "fox": "curious, energetic, poetic. You notice small details — the way water moves, how trees smell after rain.",
    "owl": "wise, calm, observant. You speak slowly and with weight. You watch everything from above.",
    "panda": "playful, gentle, warm. You find joy in small things. You are always kind, never harsh.",
}

FALLBACK_NARRATIONS = {
    "fox": "The forest is listening, and your little sanctuary is settling into its evening glow.",
    "owl": "The night sky holds steady above you, and the sanctuary answers in quiet, patient ways.",
    "panda": "A soft breeze moves through the trees, and your sanctuary feels warm, safe, and gently alive.",
}


def fallback_narration(companion: str, name: str, world_state: dict | None = None) -> str:
    base = FALLBACK_NARRATIONS.get(companion, FALLBACK_NARRATIONS["fox"])
    season = (world_state or {}).get("season", "spring")
    return f"{base} {name}, the sanctuary keeps watch through the {season} light."


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    today_dict = req.today.model_dump()
    history_dicts = [h if isinstance(h, dict) else h for h in req.history]
    return calculate_world_state(today_dict, history_dicts)


@app.post("/narrate")
def narrate(req: NarrationRequest):
    voice = COMPANION_VOICES.get(req.companion, COMPANION_VOICES["fox"])
    companion_name = {"fox": "Fox", "owl": "Owl", "panda": "Red Panda"}.get(req.companion, "Fox")
    emoji = {"fox": "🦊", "owl": "🦉", "panda": "🐼"}.get(req.companion, "🦊")

    history_summary = ""
    if req.history:
        last7 = req.history[-7:]
        history_summary = f"Recent 7-day history: {last7}"

    ws = req.world_state or {}
    sanctuary_desc = (
        f"Sky: {ws.get('sky', 'cloudy')}, River: {ws.get('river', 'low')}, "
        f"Forest: {ws.get('forest', 'sparse')}, Season: {ws.get('season', 'spring')}, "
        f"Weather: {ws.get('weather', 'overcast')}"
    )

    prompt = f"""You are {emoji} {companion_name}, the sanctuary companion of {req.name}. 
Your personality: {voice}

Today's health data: sleep={req.today.sleep}hrs, water={req.today.water} glasses, 
exercise={req.today.exercise}, nutrition={req.today.nutrition}, mood={req.today.mood}/4

Current sanctuary state: {sanctuary_desc}
{history_summary}

Write EXACTLY 2-3 sentences in first person as the companion animal. 
- Reference specific sanctuary elements (river, forest, sky, stars, trees, weather)
- Be specific about today's actual numbers in a poetic way
- End with a gentle forward-looking line about tomorrow
- Never use clinical health language. Speak only in nature metaphors.
- No quotes, no labels, just the raw sentences."""

    text = generate_text(prompt, max_tokens=300)
    if text:
        return {"narration": text}

    return {"narration": fallback_narration(req.companion, req.name, req.world_state)}


@app.post("/chronicle")
def chronicle_legacy(req: ChronicleRequest):
    text = generate_weekly_chronicle(req.week_data, req.companion, req.name)
    return {"chronicle": text}


@app.post("/story")
def story(req: StoryRequest):
    companion_name = {"fox": "Fox", "owl": "Owl", "panda": "Red Panda"}.get(req.companion, "Fox")
    emoji = {"fox": "🦊", "owl": "🦉", "panda": "🐼"}.get(req.companion, "🦊")

    prompt = f"""Write the sanctuary story for {req.name}, narrated as a nature documentary. The companion is {emoji} {companion_name}.

Full history ({len(req.history)} days): {req.history}

Write 4 paragraphs in past tense:
1. The beginning — what the sanctuary looked like on day one
2. The first growth — the first streak or positive pattern
3. The hardest moment — the worst stretch of data, honestly but kindly
4. Where it stands today — the current state, ending with the companion and a sense of future

Use the ACTUAL data. Be specific. Be poetic. No clinical language. This is a nature story."""

    text = generate_text(prompt, max_tokens=1500)
    if text:
        return {"story": text}

    return {"story": "The sanctuary began as a small promise and grew into a gentle refuge, one calm day at a time."}


@app.post("/artifact")
def artifact(req: ArtifactRequest):
    memory = generate_artifact_memory(req.artifact, req.log_entry, req.companion, req.name)
    return {"memory": memory}


@app.get("/health")
def health():
    return {"status": "ok"}
