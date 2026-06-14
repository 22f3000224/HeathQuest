from datetime import datetime, date

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=True, index=True)
    email = Column(String(120), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=True)
    name = Column(String(120), nullable=False, default="Explorer")
    companion = Column(String(32), nullable=False, default="fox")
    created_at = Column(DateTime, default=datetime.utcnow)

    logs = relationship("DailyLog", back_populates="user", cascade="all, delete-orphan")
    sanctuary = relationship("SanctuaryState", back_populates="user", uselist=False, cascade="all, delete-orphan")
    chronicles = relationship("ChronicleEntry", back_populates="user", cascade="all, delete-orphan")
    artifacts = relationship("MuseumArtifact", back_populates="user", cascade="all, delete-orphan")
    memories = relationship("Memory", back_populates="user", cascade="all, delete-orphan")
    storybook_chapters = relationship("StorybookChapter", back_populates="user", cascade="all, delete-orphan")


class DailyLog(Base):
    __tablename__ = "daily_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    daily_entries = Column(Text, nullable=False, default='{}')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="logs")


class SanctuaryState(Base):
    __tablename__ = "sanctuary_states"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    sky = Column(String(32), nullable=False, default="cloudy")
    river = Column(String(32), nullable=False, default="low")
    forest = Column(String(32), nullable=False, default="sparse")
    weather = Column(String(32), nullable=False, default="overcast")
    season = Column(String(32), nullable=False, default="spring")
    animal = Column(String(32), nullable=False, default="resting")
    expression = Column(String(32), nullable=False, default="calm")
    crystal_level = Column(Integer, nullable=False, default=0)
    river_level = Column(Integer, nullable=False, default=0)
    forest_level = Column(Integer, nullable=False, default=0)
    lantern_level = Column(Integer, nullable=False, default=0)
    day_count = Column(Integer, nullable=False, default=0)
    xp = Column(Integer, nullable=False, default=0)
    level = Column(Integer, nullable=False, default=1)
    next_level_xp = Column(Integer, nullable=False, default=100)
    xp_awarded_today = Column(Integer, nullable=False, default=0)

    user = relationship("User", back_populates="sanctuary")


class ChronicleEntry(Base):
    __tablename__ = "chronicle_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    week_number = Column(Integer, nullable=False, default=1)
    chapter_title = Column(String(255), nullable=False, default="")
    title = Column(String(255), nullable=False, default="")
    content = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="chronicles")


class MuseumArtifact(Base):
    __tablename__ = "museum_artifacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    artifact_name = Column(String(255), nullable=False, default="")
    description = Column(Text, nullable=False, default="")
    lore = Column(Text, nullable=False, default="")
    unlocked = Column(Boolean, nullable=False, default=False)
    unlock_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="artifacts")


class Memory(Base):
    __tablename__ = "memories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    memory_type = Column(String(100), nullable=False, default="")
    title = Column(String(255), nullable=False, default="")
    summary = Column(Text, nullable=False, default="")
    importance_score = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="memories")


class StorybookChapter(Base):
    __tablename__ = "storybook_chapters"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    chapter_number = Column(Integer, nullable=False, default=1)
    title = Column(String(255), nullable=False, default="")
    content = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="storybook_chapters")
