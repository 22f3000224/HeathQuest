"""Simulate unlocking Dream Shard by adding 7 days of qualifying logs.
Run from backend directory:
    python -m tests.trigger_dream_shard
"""
import json
from datetime import date, timedelta, datetime
from core.database import SessionLocal
from core.models import User, DailyLog, MuseumArtifact, Memory, ChronicleEntry, SanctuaryState
from services.progression_engine import process_daily_log_progression


def run_simulation(user_id=None):
    db = SessionLocal()
    try:
        if user_id is None:
            user = db.query(User).order_by(User.id.desc()).first()
            if not user:
                print("No users found. Create a user first.")
                return
            user_id = user.id
        print(f"Using user_id={user_id}")

        # Build 7 days of logs with sleep >=7
        entries = {}
        for i in range(7):
            d = (date.today() - timedelta(days=i)).strftime("%Y-%m-%d")
            entries[d] = {
                "sleep": 7 + (i % 2),
                "water": 6,
                "exercise": 3,
                "nutrition": 7,
                "mood": 8
            }
        # Upsert daily_log
        dl = db.query(DailyLog).filter(DailyLog.user_id == user_id).first()
        if not dl:
            dl = DailyLog(user_id=user_id, daily_entries=json.dumps(entries))
            db.add(dl)
        else:
            # merge with existing
            existing = json.loads(dl.daily_entries) if dl.daily_entries else {}
            existing.update(entries)
            dl.daily_entries = json.dumps(existing)
        db.commit()
        print("Daily logs updated.")

        # Call progression engine
        result = process_daily_log_progression(db, user_id, entries)
        print("Progression result:")
        print(json.dumps(result, indent=2, default=str))

        # Show museum artifacts
        arts = db.query(MuseumArtifact).filter(MuseumArtifact.user_id == user_id).all()
        print("Artifacts:")
        for a in arts:
            print(f" - {a.artifact_name}: unlocked={a.unlocked} unlock_date={a.unlock_date}")

        # Show memory count
        mems = db.query(Memory).filter(Memory.user_id == user_id).all()
        print(f"Memories count: {len(mems)}")
        for m in mems[-5:]:
            print(f"  - {m.memory_type}: {m.title}")

        # Show chronicle entries
        ch = db.query(ChronicleEntry).filter(ChronicleEntry.user_id == user_id).all()
        print(f"Chronicle entries count: {len(ch)}")
        for c in ch[-5:]:
            print(f"  - {c.title} ({c.week_number})")

        # Sanctuary XP
        s = db.query(SanctuaryState).filter(SanctuaryState.user_id == user_id).first()
        print(f"Sanctuary XP: {s.xp if s else 'no sanctuary record'}")

    finally:
        db.close()

if __name__ == '__main__':
    run_simulation()
