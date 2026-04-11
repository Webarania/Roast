from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import storage

router = APIRouter()


class FeedbackRequest(BaseModel):
    session_id: str
    rating: int  # 1-5 stars
    message: str = ""
    display_name: str = ""


@router.post("/submit")
async def submit_feedback(req: FeedbackRequest):
    """Submit feedback with a star rating after completing the roast."""
    if req.rating < 1 or req.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    session = storage.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    display_name = (req.display_name or session.get("resume_data", {}).get("name", "Anonymous Dev")).strip()[:30]

    entry = {
        "session_id": req.session_id,
        "display_name": display_name,
        "rating": req.rating,
        "message": req.message.strip()[:500],
        "score": session.get("final_result", {}).get("total_score", 0),
        "badge": session.get("final_result", {}).get("badge", ""),
        "created_at": datetime.utcnow().isoformat(),
    }

    storage.add_feedback(entry)
    return {"message": "Thanks for your feedback!", "entry": entry}


@router.get("/")
async def get_feedback(limit: int = 20):
    """Get recent feedback for the feedback wall."""
    limit = max(1, min(50, limit))
    entries = storage.get_feedback(limit=limit)
    return {"entries": entries, "total": storage.get_feedback_count()}
