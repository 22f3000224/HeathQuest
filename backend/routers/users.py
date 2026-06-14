from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from routers.auth import get_current_user
from core.database import get_db
from core.models import User
from core.schemas import UserResponse
from services.user_initialization import get_user_initialization_data

router = APIRouter(prefix="/api/users", tags=["users"])


class UpdateCompanionRequest(BaseModel):
    companion: str


@router.put("/{user_id}/companion", response_model=UserResponse)
def update_user_companion(
    user_id: int, 
    request: UpdateCompanionRequest, 
    db: Session = Depends(get_db)
):
    """Update user's companion choice"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.companion = request.companion
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.get("/{user_id}/profile", response_model=UserResponse)
def get_user_profile(
    user_id: int, 
    db: Session = Depends(get_db)
):
    """Get user profile"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse.model_validate(user)


@router.get("/{user_id}/init")
def initialize_user_state(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get complete user initialization data for login reconstruction"""
    init_data = get_user_initialization_data(db, user_id)
    if not init_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    return init_data


@router.get("/{user_id}/xp")
def get_user_xp_breakdown(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed XP breakdown for user"""
    from services.xp_calculator import calculate_user_xp
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    xp_data = calculate_user_xp(db, user_id)
    return xp_data