import uuid
import json
import os
import logging
from datetime import datetime
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# Persistence paths
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
SESSIONS_FILE = os.path.join(DATA_DIR, "sessions.json")
LEADERBOARD_FILE = os.path.join(DATA_DIR, "leaderboard.json")
SHARE_FILE = os.path.join(DATA_DIR, "shares.json")

# Ensure data dir exists
os.makedirs(DATA_DIR, exist_ok=True)

# In-memory stores
sessions: Dict[str, dict] = {}
leaderboard: List[dict] = []
share_store: Dict[str, dict] = {}

def load_data():
    global sessions, leaderboard, share_store
    try:
        if os.path.exists(SESSIONS_FILE):
            with open(SESSIONS_FILE, "r") as f:
                sessions = json.load(f)
        if os.path.exists(LEADERBOARD_FILE):
            with open(LEADERBOARD_FILE, "r") as f:
                leaderboard = json.load(f)
        if os.path.exists(SHARE_FILE):
            with open(SHARE_FILE, "r") as f:
                share_store = json.load(f)
        logger.info(f"Data loaded: {len(sessions)} sessions, {len(leaderboard)} leaderboard entries")
    except Exception as e:
        logger.error(f"Error loading data: {e}")

def save_data():
    try:
        with open(SESSIONS_FILE, "w") as f:
            json.dump(sessions, f)
        with open(LEADERBOARD_FILE, "w") as f:
            json.dump(leaderboard, f)
        with open(SHARE_FILE, "w") as f:
            json.dump(share_store, f)
    except Exception as e:
        logger.error(f"Error saving data: {e}")

# Load data on startup
load_data()

def create_session() -> str:
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "id": session_id,
        "created_at": datetime.utcnow().isoformat(),
        "resume_data": None,
        "initial_roast": None,
        "questions": [],
        "evaluations": [],
        "intensity": "medium",
        "final_result": None,
    }
    save_data()
    return session_id


def get_session(session_id: str) -> Optional[dict]:
    return sessions.get(session_id)


def update_session(session_id: str, key: str, value) -> bool:
    if session_id not in sessions:
        return False
    sessions[session_id][key] = value
    save_data()
    return True


def add_to_leaderboard(entry: dict) -> int:
    # Check if session already exists on leaderboard
    for i, e in enumerate(leaderboard):
        if e["session_id"] == entry["session_id"]:
            leaderboard[i] = entry
            leaderboard.sort(key=lambda x: x["score"], reverse=True)
            save_data()
            return next(i for i, e in enumerate(leaderboard) if e["session_id"] == entry["session_id"]) + 1

    leaderboard.append(entry)
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    save_data()
    return next(i for i, e in enumerate(leaderboard) if e["session_id"] == entry["session_id"]) + 1


def get_leaderboard(limit: int = 50, offset: int = 0) -> List[dict]:
    return leaderboard[offset:offset + limit]


def get_user_rank(session_id: str) -> int:
    for i, e in enumerate(leaderboard):
        if e["session_id"] == session_id:
            return i + 1
    return -1


def create_share(session_id: str, data: dict) -> str:
    share_id = str(uuid.uuid4())[:8]
    share_store[share_id] = {
        "session_id": session_id,
        "data": data,
        "created_at": datetime.utcnow().isoformat(),
    }
    save_data()
    return share_id


def get_share(share_id: str) -> Optional[dict]:
    return share_store.get(share_id)


def cleanup_old_sessions(max_age_hours: int = 2) -> int:
    """Remove sessions older than max_age_hours. Returns count of removed sessions."""
    now = datetime.utcnow()
    to_remove = []
    for sid, session in sessions.items():
        try:
            created = datetime.fromisoformat(session["created_at"])
            if (now - created).total_seconds() > max_age_hours * 3600:
                to_remove.append(sid)
        except:
            pass
    for sid in to_remove:
        del sessions[sid]
    if to_remove:
        save_data()
    return len(to_remove)


def get_session_count() -> int:
    return len(sessions)


def get_leaderboard_count() -> int:
    return len(leaderboard)
