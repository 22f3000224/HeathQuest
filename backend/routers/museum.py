from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from core.database import get_db
from core.models import User
from core.schemas import MuseumArtifactResponse, MuseumResponse
from services.museum_curator import get_museum_artifacts

router = APIRouter(prefix="/api/museum", tags=["museum"])


@router.get("/{user_id}", response_model=MuseumResponse)
def get_museum(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    museum_state = get_museum_artifacts(db, user_id)
    
    # Convert curator output to API-compatible format (backwards compatible)
    artifacts = []
    for artifact_data in museum_state["artifacts"]:
        # support both keys coming from curator or legacy JSON
        name = artifact_data.get("artifact_name") or artifact_data.get("display_name") or ""
        # unlock_date may be stored as datetime or ISO string or legacy 'unlocked_at'
        raw_date = artifact_data.get("unlock_date") or artifact_data.get("unlocked_at")
        if hasattr(raw_date, "isoformat"):
            unlock_iso = raw_date.isoformat()
        else:
            unlock_iso = raw_date
        # created_at/updated_at may be missing; fall back to now
        created_at = artifact_data.get("created_at") or artifact_data.get("created")
        updated_at = artifact_data.get("updated_at") or artifact_data.get("updated")
        # Normalize to datetime, default to now when missing
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at)
            except Exception:
                created_at = datetime.now()
        elif created_at is None:
            created_at = datetime.now()

        if isinstance(updated_at, str):
            try:
                updated_at = datetime.fromisoformat(updated_at)
            except Exception:
                updated_at = datetime.now()
        elif updated_at is None:
            updated_at = datetime.now()

        artifacts.append(MuseumArtifactResponse(
            id=artifact_data.get("id"),
            user_id=user_id,
            artifact_name=name,
            description=artifact_data.get("description") or "",
            lore=artifact_data.get("lore") or "",
            unlocked=bool(artifact_data.get("unlocked", False)),
            unlock_date=datetime.fromisoformat(unlock_iso) if isinstance(unlock_iso, str) and unlock_iso is not None else (unlock_iso if hasattr(unlock_iso, 'isoformat') else None),
            created_at=created_at,
            updated_at=updated_at,
        ))

    return MuseumResponse(
        user_id=user_id,
        artifacts=artifacts,
        unlocked_count=museum_state["unlocked_count"],
        total_count=museum_state["total_count"],
    )
