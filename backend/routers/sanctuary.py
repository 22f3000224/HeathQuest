from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.schemas import SanctuaryStateResponse
from services.sanctuary_service import get_sanctuary_state, default_sanctuary_state

router = APIRouter(prefix="/sanctuary", tags=["sanctuary"])


@router.get("/{user_id}", response_model=SanctuaryStateResponse)
def get_sanctuary_endpoint(user_id: int, db: Session = Depends(get_db)):
    """Get sanctuary state for a user"""
    state = get_sanctuary_state(db, user_id)
    if state is None:
        # Return default sanctuary state for new users
        state = default_sanctuary_state(user_id)
        db.add(state)
        db.commit()
        db.refresh(state)
    
    return SanctuaryStateResponse.model_validate(state)