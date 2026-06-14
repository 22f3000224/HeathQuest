from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.models import User
from core.schemas import ChronicleEntryResponse
from services.chronicle_generator import get_user_chronicles

router = APIRouter(prefix="/api/chronicle", tags=["chronicle"])


@router.get("/{user_id}", response_model=list[ChronicleEntryResponse])
def list_chronicles(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    entries = get_user_chronicles(db, user_id, limit=50)
    return [ChronicleEntryResponse.model_validate(e) for e in entries if isinstance(e, dict)]
