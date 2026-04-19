import re
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
        feedback_col = db.get_collection("feedback")

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
    _feedback_store: List[dict] = []

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
    # Use mobile or email as the unique key to prevent duplicate entries for the same person
    mobile = entry.get("mobile", "").strip()
    email = entry.get("email", "").strip()
    if USE_MONGO:
        if mobile:
            leaderboard_col.update_one({"mobile": mobile}, {"$set": entry}, upsert=True)
        elif email:
            leaderboard_col.update_one({"email": email}, {"$set": entry}, upsert=True)
        else:
            leaderboard_col.update_one({"session_id": entry["session_id"]}, {"$set": entry}, upsert=True)
        higher_scores = leaderboard_col.count_documents({"score": {"$gt": entry["score"]}})
        return higher_scores + 1
    else:
        match_key = None
        for i, e in enumerate(_leaderboard):
            if mobile and e.get("mobile") == mobile:
                match_key = i
                break
            if email and e.get("email") == email:
                match_key = i
                break
            if e["session_id"] == entry["session_id"]:
                match_key = i
                break

        if match_key is not None:
            _leaderboard[match_key] = entry
        else:
            _leaderboard.append(entry)

        _leaderboard.sort(key=lambda x: x["score"], reverse=True)
        return next(i for i, e in enumerate(_leaderboard) if e["session_id"] == entry["session_id"]) + 1

def _unique_key_expr():
    """
    MongoDB expression that produces a unique-user key.
    Priority: mobile (non-empty) → email (non-empty) → lowercase display_name.
    """
    return {
        "$cond": {
            "if": {"$and": [{"$ne": ["$mobile", ""]}, {"$ne": ["$mobile", None]}]},
            "then": "$mobile",
            "else": {
                "$cond": {
                    "if": {"$and": [{"$ne": ["$email", ""]}, {"$ne": ["$email", None]}]},
                    "then": "$email",
                    "else": {"$toLower": "$display_name"},
                }
            },
        }
    }


def _dedup_pipeline(match_stage: dict, offset: int, limit: int) -> list:
    """Build an aggregation pipeline that deduplicates by mobile/email/name."""
    return [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {"$sort": {"score": pymongo.DESCENDING}},
        {"$group": {
            "_id": _unique_key_expr(),
            "display_name": {"$first": "$display_name"},
            "score": {"$max": "$score"},
            "badge": {"$first": "$badge"},
            "badge_title": {"$first": "$badge_title"},
            "timestamp": {"$first": "$timestamp"},
            "session_id": {"$first": "$session_id"},
            "mobile": {"$first": "$mobile"},
            "email": {"$first": "$email"},
        }},
        {"$sort": {"score": pymongo.DESCENDING}},
        {"$skip": offset},
        {"$limit": limit},
        {"$project": {"_id": 0}},
    ]


def get_leaderboard(limit: int = 50, offset: int = 0) -> List[dict]:
    if USE_MONGO:
        from datetime import datetime, timedelta
        one_week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()

        # This week, unique per mobile/email/name, highest score wins
        docs = list(leaderboard_col.aggregate(
            _dedup_pipeline({"timestamp": {"$gte": one_week_ago}}, offset, limit)
        ))

        # Fallback: all-time if week is empty
        if not docs:
            docs = list(leaderboard_col.aggregate(
                _dedup_pipeline({}, offset, limit)
            ))
        return docs

    # In-memory: deduplicate by mobile → email → display_name
    seen = {}
    for entry in _leaderboard:
        mobile = (entry.get("mobile") or "").strip()
        email = (entry.get("email") or "").strip()
        name = (entry.get("display_name") or "").strip().lower()
        key = mobile or email or name
        if not key:
            key = entry.get("session_id", "")
        if key not in seen or entry["score"] > seen[key]["score"]:
            seen[key] = entry
    unique_sorted = sorted(seen.values(), key=lambda x: x["score"], reverse=True)
    return unique_sorted[offset:offset + limit]

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

def get_avg_session_time() -> int:
    """Calculate avg time from creation to final result in seconds."""
    if USE_MONGO:
        # Get last 100 completed sessions
        docs = list(sessions_col.find({"final_result": {"$ne": None}}).sort("created_at", -1).limit(100))
        if not docs:
            return 0
        
        # For now, since we don't have a finished_at field, we'll return 0 
        # until we implement precise timing or have enough data to derive it.
        return 0
    return 0

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


def remove_leaderboard_by_name(display_name: str) -> int:
    """Remove leaderboard entries matching a display_name (case-insensitive)."""
    name_lower = display_name.strip().lower()
    if USE_MONGO:
        result = leaderboard_col.delete_many({
            "display_name": {"$regex": f"^{re.escape(name_lower)}$", "$options": "i"}
        })
        return result.deleted_count
    else:
        before = len(_leaderboard)
        _leaderboard[:] = [e for e in _leaderboard if e.get("display_name", "").strip().lower() != name_lower]
        return before - len(_leaderboard)


def cleanup_duplicate_leaderboard() -> dict:
    """Remove duplicate leaderboard entries, keeping the latest per mobile or display_name."""
    removed = 0
    if USE_MONGO:
        # Step 1: Dedup by mobile (non-empty)
        pipeline = [
            {"$match": {"mobile": {"$exists": True, "$ne": ""}}},
            {"$sort": {"timestamp": -1}},
            {"$group": {"_id": "$mobile", "latest_id": {"$first": "$_id"}, "count": {"$sum": 1}, "ids": {"$push": "$_id"}}},
            {"$match": {"count": {"$gt": 1}}},
        ]
        for group in leaderboard_col.aggregate(pipeline):
            # Delete all except the latest
            ids_to_delete = [oid for oid in group["ids"] if oid != group["latest_id"]]
            if ids_to_delete:
                result = leaderboard_col.delete_many({"_id": {"$in": ids_to_delete}})
                removed += result.deleted_count

        # Step 2: Dedup by display_name for entries without mobile
        pipeline2 = [
            {"$match": {"$or": [{"mobile": {"$exists": False}}, {"mobile": ""}]}},
            {"$sort": {"timestamp": -1}},
            {"$group": {"_id": {"$toLower": "$display_name"}, "latest_id": {"$first": "$_id"}, "count": {"$sum": 1}, "ids": {"$push": "$_id"}}},
            {"$match": {"count": {"$gt": 1}}},
        ]
        for group in leaderboard_col.aggregate(pipeline2):
            ids_to_delete = [oid for oid in group["ids"] if oid != group["latest_id"]]
            if ids_to_delete:
                result = leaderboard_col.delete_many({"_id": {"$in": ids_to_delete}})
                removed += result.deleted_count

        # Step 3: Also dedup by display_name across ALL entries (catches old entries with same name but different mobile)
        pipeline3 = [
            {"$sort": {"timestamp": -1}},
            {"$group": {"_id": {"$toLower": "$display_name"}, "latest_id": {"$first": "$_id"}, "count": {"$sum": 1}, "ids": {"$push": "$_id"}}},
            {"$match": {"count": {"$gt": 1}}},
        ]
        for group in leaderboard_col.aggregate(pipeline3):
            ids_to_delete = [oid for oid in group["ids"] if oid != group["latest_id"]]
            if ids_to_delete:
                result = leaderboard_col.delete_many({"_id": {"$in": ids_to_delete}})
                removed += result.deleted_count

        remaining = leaderboard_col.count_documents({})
    else:
        seen_mobile = {}
        seen_name = {}
        keep = []
        # Sort by timestamp desc so we keep latest
        sorted_lb = sorted(_leaderboard, key=lambda x: x.get("timestamp", ""), reverse=True)
        for entry in sorted_lb:
            mobile = entry.get("mobile", "")
            name = entry.get("display_name", "").strip().lower()
            if mobile and mobile in seen_mobile:
                removed += 1
                continue
            if name and name in seen_name:
                removed += 1
                continue
            if mobile:
                seen_mobile[mobile] = True
            if name:
                seen_name[name] = True
            keep.append(entry)
        _leaderboard.clear()
        _leaderboard.extend(sorted(keep, key=lambda x: x["score"], reverse=True))
        remaining = len(_leaderboard)

    return {"removed": removed, "remaining": remaining}


# ── Feedback ──

def add_feedback(entry: dict) -> bool:
    if USE_MONGO:
        feedback_col.insert_one(entry)
    else:
        _feedback_store.append(entry)
    return True


def get_feedback(limit: int = 20) -> List[dict]:
    if USE_MONGO:
        docs = list(
            feedback_col.find({}, {"_id": 0})
            .sort("created_at", pymongo.DESCENDING)
            .limit(limit)
        )
        return docs
    return sorted(_feedback_store, key=lambda x: x.get("created_at", ""), reverse=True)[:limit]


def get_feedback_count() -> int:
    if USE_MONGO:
        return feedback_col.count_documents({})
    return len(_feedback_store)
