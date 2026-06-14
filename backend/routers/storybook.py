from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.models import StorybookChapter, User
from core.schemas import StorybookChapterResponse
from services.ai_context_service import build_ai_context
from services.groq_service import generate_text

router = APIRouter(prefix="/api/storybook", tags=["storybook"])


@router.get("/{user_id}", response_model=List[StorybookChapterResponse])
def get_storybook(user_id: int, db: Session = Depends(get_db)):
    chapters = (
        db.query(StorybookChapter)
        .filter(StorybookChapter.user_id == user_id)
        .order_by(StorybookChapter.chapter_number)
        .all()
    )
    return [StorybookChapterResponse.model_validate(chapter) for chapter in chapters]


@router.get("/{user_id}/{chapter_number}", response_model=StorybookChapterResponse)
def get_chapter(user_id: int, chapter_number: int, db: Session = Depends(get_db)):
    chapter = (
        db.query(StorybookChapter)
        .filter(StorybookChapter.user_id == user_id, StorybookChapter.chapter_number == chapter_number)
        .first()
    )
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return StorybookChapterResponse.model_validate(chapter)


@router.post("/{user_id}/generate")
def generate_chapter(user_id: int, db: Session = Depends(get_db)):
    """Generate next storybook chapter using AI context"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get next chapter number
    last_chapter = (
        db.query(StorybookChapter)
        .filter(StorybookChapter.user_id == user_id)
        .order_by(StorybookChapter.chapter_number.desc())
        .first()
    )
    next_chapter_num = (last_chapter.chapter_number + 1) if last_chapter else 1
    
    # Build AI context
    context = build_ai_context(db, user_id)
    
    companion_emoji = {"fox": "🦊", "owl": "🦉", "panda": "🐼"}.get(user.companion, "🦊")
    
    # Generate chapter
    prompt = f"""Write Chapter {next_chapter_num} of {context.user.name}'s sanctuary story.
    
Previous chapters: {len(context.storybook_chapters)} chapters already written
Important memories: {[mem['title'] for mem in context.memories[:3]]}
Recent artifacts: {[art['name'] for art in context.artifacts[-2:]]}
Current state: {context.sanctuary_state}
Days logged: {context.days_logged}
Current trends: {context.recent_trends}

Write a 3-paragraph chapter in past tense:
1. The sanctuary's current state and recent changes
2. A meaningful moment or realization from recent logs
3. The companion {companion_emoji} {user.companion}'s observation and what lies ahead

Title the chapter poetically. Use actual data from the context.
Format as: Title: [title]\\n\\n[content]"""

    response = generate_text(prompt, max_tokens=1000)
    if not response:
        raise HTTPException(status_code=500, detail="Failed to generate chapter")
    
    # Parse title and content
    lines = response.strip().split('\n', 1)
    if len(lines) >= 2 and lines[0].startswith('Title:'):
        title = lines[0].replace('Title:', '').strip()
        content = lines[1].strip()
    else:
        title = f"Chapter {next_chapter_num}: The Journey Continues"
        content = response
    
    # Save chapter
    chapter = StorybookChapter(
        user_id=user_id,
        chapter_number=next_chapter_num,
        title=title,
        content=content
    )
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    
    return StorybookChapterResponse.model_validate(chapter)