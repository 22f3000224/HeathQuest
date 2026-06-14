from datetime import date, timedelta, datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from core.database import get_db
from core.models import DailyLog
from core.schemas import DailyLogCreate, LogSubmitResponse, SanctuaryStateResponse
from core.schemas import DailyLogResponse, ChronicleEntryResponse
from services.progression_engine import process_daily_log_progression
from services.sanctuary_service import (
    apply_world_state,
    ensure_user,
    get_history_dicts,
    get_user_logs,
    log_to_dict,
    get_sanctuary_state,
    default_sanctuary_state
)
from utils.json_helpers import DailyLogHelper

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.post("", response_model=LogSubmitResponse)
def submit_log(payload: DailyLogCreate, db: Session = Depends(get_db)):
    """
    Submit daily log - ONLY ONE LOG ALLOWED PER DAY
    Backend validation enforces single daily submission
    """
    user = ensure_user(db, payload.user_id)
    today = date.today()
    today_str = today.isoformat()

    # Get existing daily log record (JSON structure)
    daily_log_record = db.query(DailyLog).filter(
        DailyLog.user_id == payload.user_id
    ).first()
    
    if not daily_log_record:
        daily_log_record = DailyLog(
            user_id=payload.user_id,
            daily_entries='{}'
        )
        db.add(daily_log_record)
        db.flush()
    
    # CRITICAL: Backend validation - Check if already logged today
    existing_entry = DailyLogHelper.get_daily_entry(daily_log_record.daily_entries, today_str)
    if existing_entry:
        raise HTTPException(
            status_code=400,
            detail="Daily Log already completed today"
        )

    # Add today's log to JSON structure
    log_data = {
        "sleep": payload.sleep,
        "water": payload.water,
        "exercise": payload.exercise,
        "nutrition": payload.nutrition,
        "mood": payload.mood,
        "logged_at": datetime.now().isoformat()
    }
    
    updated_entries = DailyLogHelper.add_daily_entry(
        daily_log_record.daily_entries, today_str, log_data
    )
    daily_log_record.daily_entries = updated_entries
    
    # Apply sanctuary world state (existing logic)
    history = get_history_dicts(db, payload.user_id, exclude_today=True)
    sanctuary = apply_world_state(db, payload.user_id, log_data, history)

    # Process all progression systems through new engine
    progression_results = process_daily_log_progression(db, payload.user_id, log_data)
    
    # Recalculate XP from database records
    from services.xp_calculator import recalculate_sanctuary_xp
    sanctuary = recalculate_sanctuary_xp(db, payload.user_id)
    
    db.commit()
    db.refresh(daily_log_record)
    db.refresh(sanctuary)

    # Create response in old format for compatibility
    # Ensure types match `DailyLogResponse` (strings for exercise/nutrition, datetime for created_at)
    exercise_map = {"none": "none", "light": "light", "moderate": "moderate", "intense": "intense"}
    nutrition_map = {"poor": "poor", "okay": "okay", "good": "good", "great": "great"}
    log_response = DailyLogResponse(
        id=daily_log_record.id,
        user_id=payload.user_id,
        date=today.isoformat(),
        sleep=payload.sleep,
        water=payload.water,
        exercise=exercise_map.get(payload.exercise, str(payload.exercise)),
        nutrition=nutrition_map.get(payload.nutrition, str(payload.nutrition)),
        mood=payload.mood,
        created_at=datetime.now()
    )
    
    # Create mock chronicle response for compatibility
    chronicle_response = ChronicleEntryResponse(
        id=1,  # Mock ID
        user_id=payload.user_id,
        week_number=1,  # Mock week
        chapter_title="Current Journey",
        title="Daily Progress",
        content="Your journey continues with each mindful choice.",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )

    return LogSubmitResponse(
        log=log_response,
        sanctuary=SanctuaryStateResponse.model_validate(sanctuary),
        chronicle=chronicle_response,
        new_artifacts=progression_results["artifacts"]["new_unlocks"],
    )


class DailyLogStatus(BaseModel):
    has_logged_today: bool
    today_log_id: int = None
    next_available_at: str = None


@router.get("/status/{user_id}", response_model=DailyLogStatus)
def get_daily_log_status(user_id: int, db: Session = Depends(get_db)):
    """Check if user has logged today and when next log is available"""
    today = date.today()
    today_str = today.isoformat()
    
    # Read the single DailyLog record (JSON map of date->entry)
    record = db.query(DailyLog).filter(DailyLog.user_id == user_id).first()
    if not record:
        return DailyLogStatus(
            has_logged_today=False, 
            next_available_at=today_str
        )

    entry = DailyLogHelper.get_daily_entry(record.daily_entries, today_str)
    if entry:
        tomorrow = today + timedelta(days=1)
        return DailyLogStatus(
            has_logged_today=True, 
            today_log_id=record.id, 
            next_available_at=tomorrow.isoformat()
        )
    
    return DailyLogStatus(
        has_logged_today=False, 
        next_available_at=today_str
    )


@router.get("/{user_id}", response_model=List[DailyLogResponse])
def get_user_logs_endpoint(user_id: int, db: Session = Depends(get_db), limit: int = 90):
    """Get all logs for a user (most recent first)"""
    record = db.query(DailyLog).filter(DailyLog.user_id == user_id).first()
    if not record:
        return []
    # daily_entries is a JSON map date->entry
    data = DailyLogHelper.get_recent_logs(record.daily_entries, days=limit)
    # Convert to list of log dicts with `date` property, newest first
    logs = []
    for d in sorted(data.keys(), reverse=True):
        e = data[d]
        # normalize exercise/nutrition to strings and created_at to datetime
        exercise_val = e.get("exercise")
        nutrition_val = e.get("nutrition")
        # if numeric codes present, map them to labels
        num_to_ex = {0: "none", 1: "light", 2: "moderate", 3: "intense"}
        num_to_nut = {0: "poor", 1: "okay", 2: "good", 3: "great"}
        ex = exercise_val if isinstance(exercise_val, str) else num_to_ex.get(exercise_val, str(exercise_val))
        nut = nutrition_val if isinstance(nutrition_val, str) else num_to_nut.get(nutrition_val, str(nutrition_val))
        logged_at = e.get("logged_at")
        created_at = None
        try:
            if isinstance(logged_at, str):
                created_at = datetime.fromisoformat(logged_at)
        except Exception:
            created_at = datetime.now()

        log = {
            "id": record.id,
            "user_id": record.user_id,
            "date": d,
            "sleep": e.get("sleep"),
            "water": e.get("water"),
            "exercise": ex,
            "nutrition": nut,
            "mood": e.get("mood"),
            "created_at": created_at,
        }
        logs.append(log)
    return logs


@router.get("/{user_id}/today", response_model=DailyLogResponse)
def get_today_log(user_id: int, db: Session = Depends(get_db)):
    """Get today's log for a user"""
    today = date.today()
    record = db.query(DailyLog).filter(DailyLog.user_id == user_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="No log found for today")
    entry = DailyLogHelper.get_daily_entry(record.daily_entries, today.isoformat())
    if not entry:
        raise HTTPException(status_code=404, detail="No log found for today")
    created_at = None
    try:
        if isinstance(entry.get("logged_at"), str):
            created_at = datetime.fromisoformat(entry.get("logged_at"))
    except Exception:
        created_at = datetime.now()
    return {
        "id": record.id,
        "user_id": record.user_id,
        "date": today.isoformat(),
        "sleep": entry.get("sleep"),
        "water": entry.get("water"),
        "exercise": entry.get("exercise") if isinstance(entry.get("exercise"), str) else {0: "none",1: "light",2: "moderate",3: "intense"}.get(entry.get("exercise"), str(entry.get("exercise"))),
        "nutrition": entry.get("nutrition") if isinstance(entry.get("nutrition"), str) else {0: "poor",1: "okay",2: "good",3: "great"}.get(entry.get("nutrition"), str(entry.get("nutrition"))),
        "mood": entry.get("mood"),
        "created_at": created_at,
    }
