from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.schemas import AIContext
from services.ai_context_service import build_ai_context

router = APIRouter(prefix="/api/context", tags=["context"])


@router.get("/{user_id}", response_model=AIContext)
def get_context(user_id: int, db: Session = Depends(get_db)):
    try:
        return build_ai_context(db, user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))