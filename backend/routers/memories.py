from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.schemas import MemoryCreate, MemoryResponse
from services.memory_service import create_memory, get_user_memories

router = APIRouter(prefix="/api/memories", tags=["memories"])


@router.get("/{user_id}", response_model=List[MemoryResponse])
def get_memories(user_id: int, db: Session = Depends(get_db)):
    return get_user_memories(db, user_id)


@router.post("", response_model=MemoryResponse)
def create_user_memory(memory: MemoryCreate, db: Session = Depends(get_db)):
    return create_memory(db, memory)