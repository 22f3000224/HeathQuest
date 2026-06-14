from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.models import User
from core.schemas import ReflectionResponse
from services.chronicle_service import generate_weekly_chronicle
from services.sanctuary_service import get_history_dicts

router = APIRouter(prefix="/api/reflection", tags=["reflection"])


@router.get("/{user_id}", response_model=ReflectionResponse)
def get_reflection(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    history = get_history_dicts(db, user_id)
    recent = history[-7:] if history else []
    text = generate_weekly_chronicle(recent, user.companion, user.name)
    return {"reflection": text}
