from datetime import datetime

from fastapi import APIRouter, HTTPException

import storage
from models import LeaderboardSubmitRequest

router = APIRouter()


@router.post("/submit")
async def submit_to_leaderboard(req: LeaderboardSubmitRequest):
    """Submit a completed session score to the leaderboard."""
    session = storage.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    final_result = session.get("final_result")
    if not final_result:
        raise HTTPException(status_code=400, detail="Complete the interview before submitting")

    display_name = (req.display_name or "Anonymous Dev").strip()[:30]

    resume_data = session.get("resume_data", {})
    evaluations = session.get("evaluations", [])

    # Per-skill scores for breakdown
    skill_scores = {}
    for e in evaluations:
        skill = e.get("skill", "unknown")
        skill_scores[skill] = e.get("score", 0)

    entry = {
        "session_id": req.session_id,
        "display_name": display_name,
        "mobile": session.get("mobile", ""),
        "email": session.get("email", ""),
        "score": final_result["total_score"],
        "badge": final_result["badge"],
        "badge_title": final_result["badge_title"],
        "timestamp": datetime.utcnow().isoformat(),
        "skills": resume_data.get("skills", [])[:15],
        "job_title": resume_data.get("job_title", ""),
        "experience_level": resume_data.get("experience_level", ""),
        "skill_scores": skill_scores,
        "total_questions": len(evaluations),
        "bluff_count": sum(1 for e in evaluations if e.get("is_bluffing", False)),
        "fake_skills": final_result.get("fake_skills", []),
    }

    rank = storage.add_to_leaderboard(entry)

    return {
        "rank": rank,
        "entry": entry,
        "message": f"You ranked #{rank} on the leaderboard!",
    }


@router.get("/")
async def get_leaderboard(limit: int = 20, offset: int = 0):
    """Get the top scores leaderboard."""
    limit = max(1, min(50, limit))
    entries = storage.get_leaderboard(limit=limit, offset=offset)

    ranked = []
    for i, entry in enumerate(entries):
        ranked.append({
            "rank": offset + i + 1,
            "display_name": entry["display_name"],
            "score": entry["score"],
            "badge": entry["badge"],
            "badge_title": entry["badge_title"],
            "timestamp": entry["timestamp"],
        })

    return {
        "entries": ranked,
        "total": storage.get_leaderboard_count(),
    }


@router.get("/rank/{session_id}")
async def get_my_rank(session_id: str):
    """Get the rank for a specific session."""
    rank = storage.get_user_rank(session_id)
    if rank == -1:
        raise HTTPException(status_code=404, detail="Session not on leaderboard yet")
    return {"rank": rank, "total": storage.get_leaderboard_count()}
