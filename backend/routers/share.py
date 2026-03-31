from fastapi import APIRouter, HTTPException

import storage
from config import FRONTEND_URL
from models import ShareRequest, ChallengeRequest
from services.ai_gateway import call_groq

router = APIRouter()


@router.post("/generate")
async def generate_share(req: ShareRequest):
    """Generate a shareable link for a session result."""
    session = storage.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    final_result = session.get("final_result")
    if not final_result:
        raise HTTPException(status_code=400, detail="Complete the interview first")

    resume_data = session.get("resume_data", {})
    display_name = (req.display_name or resume_data.get("name", "A Developer")).strip()[:30]

    share_data = {
        "display_name": display_name,
        "score": final_result["total_score"],
        "badge": final_result["badge"],
        "badge_title": final_result["badge_title"],
        "final_roast": final_result["final_roast"],
        "fake_skills": final_result.get("fake_skills", []),
    }

    share_id = storage.create_share(req.session_id, share_data)
    share_url = f"{FRONTEND_URL}/share/{share_id}"

    score = final_result["total_score"]
    badge_title = final_result["badge_title"]
    roast_snippet = final_result["final_roast"][:100] + "..." if len(final_result["final_roast"]) > 100 else final_result["final_roast"]

    share_text = (
        f"🔥 I just got roasted by Dev Roast AI!\n\n"
        f"Score: {score}/100 | Badge: {badge_title}\n\n"
        f'"{roast_snippet}"\n\n'
        f"Think you can do better? Challenge me: {share_url}"
    )

    return {
        "share_id": share_id,
        "share_url": share_url,
        "share_text": share_text,
        "share_data": share_data,
    }


@router.post("/challenge")
async def challenge_compare(req: ChallengeRequest):
    """Compare two players' results for a challenge."""
    # Get challenger's shared result
    challenger_share = storage.get_share(req.challenger_share_id)
    if not challenger_share:
        raise HTTPException(status_code=404, detail="Challenger share link not found")

    # Get current user's session
    session = storage.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    final_result = session.get("final_result")
    if not final_result:
        raise HTTPException(status_code=400, detail="Complete the interview first")

    challenger_data = challenger_share["data"]
    resume_data = session.get("resume_data", {})
    your_name = resume_data.get("name", "You")

    challenger_score = challenger_data.get("score", 0)
    your_score = final_result.get("total_score", 0)
    score_diff = abs(challenger_score - your_score)

    if challenger_score > your_score:
        winner = "challenger"
    elif your_score > challenger_score:
        winner = "you"
    else:
        winner = "tie"

    # Generate a funny comparison roast
    try:
        from services.ai_gateway import generate_comparison_roast
        comparison_roast = await generate_comparison_roast(
            challenger_data.get("display_name", "Challenger"),
            challenger_score,
            your_name,
            your_score,
            "the challenger" if winner == "challenger" else your_name if winner == "you" else "tie"
        )
    except Exception:
        comparison_roast = f"Score diff of {score_diff}? One of you clearly copy-pasted their resume better."

    return {
        "challenger": {
            "display_name": challenger_data.get("display_name", "Challenger"),
            "score": challenger_score,
            "badge": challenger_data.get("badge", ""),
            "badge_title": challenger_data.get("badge_title", ""),
        },
        "you": {
            "display_name": your_name,
            "score": your_score,
            "badge": final_result.get("badge", ""),
            "badge_title": final_result.get("badge_title", ""),
        },
        "winner": winner,
        "score_diff": score_diff,
        "roast": comparison_roast,
    }


@router.get("/{share_id}")
async def get_shared_result(share_id: str):
    """Get a shared result by share ID."""
    share = storage.get_share(share_id)
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found or expired")

    return {
        "share_id": share_id,
        **share["data"],
        "created_at": share["created_at"],
    }
