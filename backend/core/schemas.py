from datetime import date, datetime
from typing import Optional, List, Dict, Any
from typing import Literal
from pydantic import BaseModel, Field


# ─── Authentication Schemas ──────────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str
    password: str = Field(min_length=6)
    name: Optional[str] = "Explorer"
    companion: Optional[str] = "fox"


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: Optional[str]
    email: Optional[str]
    name: str
    companion: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# ─── Memory Schemas ───────────────────────────────────────────────────────────

class MemoryCreate(BaseModel):
    user_id: int
    memory_type: str
    title: str
    summary: str
    importance_score: int = Field(ge=1, le=10, default=5)


class MemoryResponse(BaseModel):
    id: int
    user_id: int
    memories_data: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── AI Context Schema ────────────────────────────────────────────────────────

class AIContext(BaseModel):
    user: UserResponse
    days_logged: int
    recent_logs: List[dict]
    memories: List[MemoryResponse]
    artifacts: List[dict]
    chronicles: List[dict]
    storybook_chapters: List[dict]
    sanctuary_state: dict
    recent_trends: dict
    milestones: List[dict]


# ─── Enhanced Schemas ─────────────────────────────────────────────────────────

class StorybookChapterResponse(BaseModel):
    id: int
    user_id: int
    chapters_data: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Legacy (frontend-compatible) ─────────────────────────────────────────────

class LogEntry(BaseModel):
    sleep: int
    water: int
    exercise: str
    nutrition: str
    mood: int


class AnalyzeRequest(BaseModel):
    today: LogEntry
    history: list = []


class NarrationRequest(BaseModel):
    today: LogEntry
    history: list
    companion: str
    name: str
    world_state: Optional[dict] = None


class ChronicleRequest(BaseModel):
    week_data: list
    companion: str
    name: str


class StoryRequest(BaseModel):
    history: list
    companion: str
    name: str


class ArtifactRequest(BaseModel):
    artifact: str
    log_entry: dict = Field(default_factory=dict)
    companion: str = "fox"
    name: str = "Explorer"


# ─── New API ──────────────────────────────────────────────────────────────────

class DailyLogCreate(BaseModel):
    user_id: int = 1
    sleep: int = Field(ge=0, le=12)
    water: int = Field(ge=0, le=12)
    exercise: Literal["none", "light", "moderate", "intense"]
    nutrition: Literal["poor", "okay", "good", "great"]
    mood: int = Field(ge=1, le=4)


class DailyLogResponse(BaseModel):
    id: int
    user_id: int
    date: str
    sleep: int
    water: int
    exercise: str
    nutrition: str
    mood: int
    created_at: datetime

    class Config:
        from_attributes = True


class SanctuaryStateResponse(BaseModel):
    user_id: int
    sky: str
    river: str
    forest: str
    weather: str
    season: str
    animal: str
    expression: str
    crystal_level: int
    river_level: int
    forest_level: int
    lantern_level: int
    day_count: int
    xp: int
    level: int
    next_level_xp: int
    xp_awarded_today: int

    class Config:
        from_attributes = True


class LogSubmitResponse(BaseModel):
    log: DailyLogResponse
    sanctuary: SanctuaryStateResponse
    chronicle: Optional["ChronicleEntryResponse"] = None
    new_artifacts: list[str] = []


class CompanionAdviceRequest(BaseModel):
    user_id: int = 1


class CompanionAdviceResponse(BaseModel):
    observation: str
    reasoning: str
    advice: str
    sanctuary_impact: str


class AdvisorResponse(BaseModel):
    strongest_habit: str
    biggest_risk: str
    prediction: str
    recommended_focus: str
    reasoning: str


class ReflectionResponse(BaseModel):
    reflection: str


class ChronicleEntryResponse(BaseModel):
    id: int
    user_id: int
    week_number: int
    chapter_title: str
    title: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MuseumArtifactResponse(BaseModel):
    id: int
    user_id: int
    artifact_name: str
    description: str
    lore: str
    unlocked: bool
    unlock_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MuseumResponse(BaseModel):
    user_id: int
    artifacts: list[MuseumArtifactResponse]
    unlocked_count: int
    total_count: int

# ─── JSON Data Schemas ────────────────────────────────────────────────────────

class DailyLogEntryData(BaseModel):
    sleep: int = Field(ge=0, le=12)
    water: int = Field(ge=0, le=12)
    exercise: Literal["none", "light", "moderate", "intense"]
    nutrition: Literal["poor", "okay", "good", "great"]
    mood: int = Field(ge=1, le=4)

class ChronicleEntryData(BaseModel):
    week_number: Optional[int] = None
    chapter_title: Optional[str] = None
    title: str
    content: str
    created_at: Optional[str] = None

class ArtifactData(BaseModel):
    artifact_name: str
    description: str = ""
    lore: Optional[str] = None
    unlocked: bool = False
    unlock_date: Optional[str] = None
    unlocked_at: Optional[str] = None

class MemoryData(BaseModel):
    memory_type: str
    title: str
    summary: str
    importance_score: int = Field(ge=1, le=10, default=5)
    created_at: Optional[str] = None

class StorybookChapterData(BaseModel):
    chapter_number: int
    title: str
    content: str
    created_at: Optional[str] = None