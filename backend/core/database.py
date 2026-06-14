import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'healthquest.db')}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_sanctuary_columns():
    inspector = inspect(engine)
    if "sanctuary_states" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("sanctuary_states")}
    with engine.begin() as conn:
        if "xp" not in existing:
            conn.execute(text("ALTER TABLE sanctuary_states ADD COLUMN xp INTEGER NOT NULL DEFAULT 0"))
        if "level" not in existing:
            conn.execute(text("ALTER TABLE sanctuary_states ADD COLUMN level INTEGER NOT NULL DEFAULT 1"))
        if "next_level_xp" not in existing:
            conn.execute(text("ALTER TABLE sanctuary_states ADD COLUMN next_level_xp INTEGER NOT NULL DEFAULT 100"))
        if "xp_awarded_today" not in existing:
            conn.execute(text("ALTER TABLE sanctuary_states ADD COLUMN xp_awarded_today INTEGER NOT NULL DEFAULT 0"))


def init_db():
    from core import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _ensure_sanctuary_columns()
