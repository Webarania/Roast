import uuid
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional
import pymongo

from config import MONGODB_URI

logger = logging.getLogger(__name__)

# Fallback to in-memory if no URI provided
USE_MONGO = bool(MONGODB_URI.strip())
MONGO_ERROR = None

# Initialize MongoDB if URI exists
if USE_MONGO:
    try:
        client = pymongo.MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        # Force a connection check
        client.admin.command('ping')
        
        db = client.get_database("devroast")
        sessions_col = db.get_collection("sessions")
        leaderboard_col = db.get_collection("leaderboard")
        shares_col = db.get_collection("shares")
        
        logger.info("🟢 Successfully connected to MongoDB Atlas!")
    except Exception as e:
        MONGO_ERROR = str(e)
        logger.error(f"Failed to connect to MongoDB: {e}")
        USE_MONGO = False

# Fallback In-memory stores
if not USE_MONGO:
    logger.warning("🟡 No valid MONGODB_URI provided. Using in-memory fallback storage. Data will reset on restart.")
    _sessions: Dict[str, dict] = {}
    _leaderboard: List[dict] = []
    _share_store: Dict[str, dict] = {}

def create_session() -> str:
    session_id = str(uuid.uuid4())
    session_data = {
        "_id": session_id, # Use _id for MongoDB
        "id": session_id,  # Keep id for frontend compatibility
        "created_at": datetime.utcnow().isoformat(),
        "resume_data": None,
        "initial_roast": None,
        "questions": [],
        "evaluations": [],
        "intensity": "medium",
        "final_result": None,
    }
    
    if USE_MONGO:
        sessions_col.insert_one(session_data)
    else:
        # Remove _id before storing in memory
        mem_data = dict(session_data)
        mem_data.pop("_id", None)
        _sessions[session_id] = mem_data
        
    return session_id

def get_session(session_id: str) -> Optional[dict]:
    if USE_MONGO:
        doc = sessions_col.find_one({"_id": session_id})
        if doc:
            doc.pop("_id", None) # Clean up internal ID before returning
        return doc
    return _sessions.get(session_id)

def update_session(session_id: str, key: str, value) -> bool:
    if USE_MONGO:
        result = sessions_col.update_one({"_id": session_id}, {"$set": {key: value}})
        return result.modified_count > 0
    
    if session_id not in _sessions:
        return False
    _sessions[session_id][key] = value
    return True

def add_to_leaderboard(entry: dict) -> int:
    if USE_MONGO:
        # Upsert the entry
        leaderboard_col.update_one(
            {"session_id": entry["session_id"]},
            {"$set": entry},
            upsert=True
        )
        # Calculate rank by counting how many docs have a higher score
        higher_scores = leaderboard_col.count_documents({"score": {"$gt": entry["score"]}})
        return higher_scores + 1
    else:
        for i, e in enumerate(_leaderboard):
            if e["session_id"] == entry["session_id"]:
                _leaderboard[i] = entry
                _leaderboard.sort(key=lambda x: x["score"], reverse=True)
                return next(i for i, e in enumerate(_leaderboard) if e["session_id"] == entry["session_id"]) + 1

        _leaderboard.append(entry)
        _leaderboard.sort(key=lambda x: x["score"], reverse=True)
        return next(i for i, e in enumerate(_leaderboard) if e["session_id"] == entry["session_id"]) + 1

def get_leaderboard(limit: int = 50, offset: int = 0) -> List[dict]:
    if USE_MONGO:
        docs = list(leaderboard_col.find({}, {"_id": 0}).sort("score", pymongo.DESCENDING).skip(offset).limit(limit))
        return docs
    return _leaderboard[offset:offset + limit]

def get_user_rank(session_id: str) -> int:
    if USE_MONGO:
        user_doc = leaderboard_col.find_one({"session_id": session_id})
        if not user_doc:
            return -1
        higher_scores = leaderboard_col.count_documents({"score": {"$gt": user_doc["score"]}})
        return higher_scores + 1
    else:
        for i, e in enumerate(_leaderboard):
            if e["session_id"] == session_id:
                return i + 1
        return -1

def create_share(session_id: str, data: dict) -> str:
    share_id = str(uuid.uuid4())[:8]
    share_data = {
        "_id": share_id,
        "session_id": session_id,
        "data": data,
        "created_at": datetime.utcnow().isoformat(),
    }
    
    if USE_MONGO:
        shares_col.insert_one(share_data)
    else:
        mem_data = dict(share_data)
        mem_data.pop("_id", None)
        _share_store[share_id] = mem_data
    return share_id

def get_share(share_id: str) -> Optional[dict]:
    if USE_MONGO:
        doc = shares_col.find_one({"_id": share_id})
        if doc:
            doc.pop("_id", None)
        return doc
    return _share_store.get(share_id)

def get_share_count() -> int:
    if USE_MONGO:
        return shares_col.count_documents({})
    return len(_share_store)

def cleanup_old_sessions(max_age_hours: int = 2) -> int:
    import datetime as dt
    cutoff = dt.datetime.utcnow() - dt.timedelta(hours=max_age_hours)
    cutoff_iso = cutoff.isoformat()
    
    if USE_MONGO:
        result = sessions_col.delete_many({"created_at": {"$lt": cutoff_iso}})
        return result.deleted_count
    else:
        now = datetime.utcnow()
        to_remove = []
        for sid, session in _sessions.items():
            try:
                created = datetime.fromisoformat(session["created_at"])
                if (now - created).total_seconds() > max_age_hours * 3600:
                    to_remove.append(sid)
            except:
                pass
        for sid in to_remove:
            del _sessions[sid]
        return len(to_remove)

def get_session_count() -> int:
    if USE_MONGO:
        return sessions_col.count_documents({})
    return len(_sessions)

def get_leaderboard_count() -> int:
    if USE_MONGO:
        return leaderboard_col.count_documents({})
    return len(_leaderboard)
