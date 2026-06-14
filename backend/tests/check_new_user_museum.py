"""Run a quick local check: create a new user and print museum state.
Usage:
    python -m backend.tests.check_new_user_museum
"""
from datetime import datetime
from core.database import SessionLocal
from core.models import User
from services.museum_curator import get_museum_artifacts


def run_check():
    db = SessionLocal()
    try:
        user = User(username=f"test_user_{int(datetime.now().timestamp())}", email=None, name="Test New", companion="fox")
        db.add(user)
        db.flush()
        user_id = user.id
        print(f"Created test user id={user_id}")

        # Ensure progression initialization
        from initialize_progression import initialize_user_progression
        # initialize_user_progression will operate on all users; to avoid side effects, we can call curator.ensure_artifact_record
        from services.museum_curator import MuseumCurator
        curator = MuseumCurator(db)
        curator.ensure_artifact_record(user_id)
        db.commit()

        state = get_museum_artifacts(db, user_id)
        print("Museum state for new user:")
        import json
        print(json.dumps(state, indent=2, default=str))

    finally:
        db.close()

if __name__ == '__main__':
    run_check()
