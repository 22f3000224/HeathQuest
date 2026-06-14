from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.models import User
from core.schemas import AdvisorResponse
from services.advisor_service import generate_advisor_summary

router = APIRouter(prefix="/api/advisor", tags=["advisor"])


@router.get("/{user_id}", response_model=AdvisorResponse)
def get_advisor(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return generate_advisor_summary(db, user_id)
