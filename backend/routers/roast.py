import logging
import asyncio

from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

import storage
from models import (
    EvaluateAnswerRequest,
    FinalRoastRequest,
    FixPlanRequest,
    InitialRoastRequest,
    StartInterviewRequest,
)
from services.ai_gateway import (
    calculate_final_score,
    evaluate_answer,
    evaluate_code,
    generate_code_challenge,
    generate_final_roast,
    generate_fix_plan,
    generate_followup,
    generate_hint,
    generate_initial_roast,
    generate_questions,
    generate_mcqs,
    get_badge,
)

router = APIRouter()
logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)


def _get_session_or_404(session_id: str) -> dict:
    session = storage.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/initial")
@limiter.limit("10/minute")
async def initial_roast(request: Request, req: InitialRoastRequest):
    """Generate the initial roast from resume data."""
    session = _get_session_or_404(req.session_id)
    resume_data = session.get("resume_data")
    if not resume_data:
        raise HTTPException(status_code=400, detail="No resume data in session")

    storage.update_session(req.session_id, "intensity", req.intensity)

    try:
        result = await generate_initial_roast(resume_data, req.intensity)
    except Exception as e:
        logger.error(f"Initial roast error: {e}")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    storage.update_session(req.session_id, "initial_roast", result)
    return result


@router.post("/questions")
@limiter.limit("10/minute")
async def start_interview(request: Request, req: StartInterviewRequest):
    """Generate interview questions based on resume (Scenario + MCQs)."""
    session = _get_session_or_404(req.session_id)
    resume_data = session.get("resume_data")
    if not resume_data:
        raise HTTPException(status_code=400, detail="No resume data in session")

    scenario_count = max(2, min(5, req.question_count))
    mcq_count = 5
    intensity = session.get("intensity", req.intensity)

    try:
        # Generate both types in parallel
        scenario_task = generate_questions(resume_data, count=scenario_count, intensity=intensity)
        mcq_task = generate_mcqs(resume_data, count=mcq_count)
        
        scenario_questions, mcq_questions = await asyncio.gather(scenario_task, mcq_task)
    except Exception as e:
        logger.error(f"Questions generation error: {e}")
        if isinstance(e, HTTPException) and e.status_code == 429:
            raise
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    # Combine and ensure proper IDs
    all_questions = []
    
    # Add MCQs first
    for i, q in enumerate(mcq_questions):
        q["id"] = f"mcq_{i+1}"
        q["type"] = "mcq"
        all_questions.append(q)
        
    # Add Scenarios
    for i, q in enumerate(scenario_questions):
        q["id"] = i + 1
        q["type"] = "scenario"
        all_questions.append(q)

    storage.update_session(req.session_id, "questions", all_questions)
    return {"questions": all_questions}


@router.post("/evaluate")
@limiter.limit("10/minute")
async def evaluate(request: Request, req: EvaluateAnswerRequest):
    """Evaluate a single interview answer (MCQ or Scenario)."""
    session = _get_session_or_404(req.session_id)
    questions = session.get("questions", [])
    
    # Find the question in session
    q_data = next((q for q in questions if str(q.get("id")) == str(req.question_id)), None)
    
    # Handle MCQ evaluation locally
    if q_data and q_data.get("type") == "mcq":
        correct = q_data.get("correct_answer")
        is_correct = str(req.answer).strip().lower() == str(correct).strip().lower()
        
        result = {
            "score": 10 if is_correct else 0,
            "mini_roast": "Nailed it! 🎯" if is_correct else f"Wrong! The correct answer was: {correct}. 🤡",
            "is_bluffing": False,
            "feedback": "Perfect technical knowledge." if is_correct else "Need to brush up on your basics.",
            "approach_rating": "strong" if is_correct else "weak",
            "key_missing": None if is_correct else f"Correct answer: {correct}"
        }
    else:
        # Scenario evaluation via AI
        try:
            result = await evaluate_answer(req.question_text, req.skill_tested, req.answer)
        except Exception as e:
            logger.error(f"Evaluation error: {e}")
            if isinstance(e, HTTPException) and e.status_code == 429:
                raise
            raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    # Store evaluation
    evaluations = session.get("evaluations", [])
    evaluations.append({
        "question_id": req.question_id,
        "question": req.question_text,
        "skill": req.skill_tested,
        "answer": req.answer,
        **result,
    })
    storage.update_session(req.session_id, "evaluations", evaluations)

    return result


@router.post("/final")
@limiter.limit("10/minute")
async def final_roast(request: Request, req: FinalRoastRequest):
    """Generate the final score, badge, and brutal roast."""
    session = _get_session_or_404(req.session_id)

    evaluations = session.get("evaluations", [])
    if not evaluations:
        raise HTTPException(status_code=400, detail="No evaluations found. Complete the interview first.")

    # Ensure intensity is in session for final roast generation
    if req.intensity != "medium" and session.get("intensity", "medium") == "medium":
        storage.update_session(req.session_id, "intensity", req.intensity)
        session["intensity"] = req.intensity

    try:
        ai_result = await generate_final_roast(session)
    except Exception as e:
        logger.error(f"Final roast error: {e}")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    total_score = calculate_final_score(evaluations)
    badge_id, badge_title = get_badge(total_score)

    scores_by_skill = {}
    for e in evaluations:
        skill = e.get("skill", "unknown")
        scores_by_skill[skill] = e.get("score", 0)

    final_result = {
        "total_score": total_score,
        "badge": badge_id,
        "badge_title": badge_title,
        "final_roast": ai_result.get("final_roast", "You survived the roast!"),
        "fake_skills": ai_result.get("fake_skills", []),
        "breakdown": {
            "per_skill_scores": scores_by_skill,
            "avg_per_question": round(sum(e.get("score", 0) for e in evaluations) / len(evaluations), 1),
            "total_questions": len(evaluations),
            "bluff_count": sum(1 for e in evaluations if e.get("is_bluffing", False)),
        },
    }

    storage.update_session(req.session_id, "final_result", final_result)
    return final_result


@router.post("/fixplan")
@limiter.limit("10/minute")
async def fix_plan(request: Request, req: FixPlanRequest):
    """Generate a personalized learning fix plan."""
    session = _get_session_or_404(req.session_id)

    if not session.get("final_result"):
        raise HTTPException(status_code=400, detail="Complete the interview first")

    try:
        result = await generate_fix_plan(session)
    except Exception as e:
        logger.error(f"Fix plan error: {e}")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    return result


# ─── Real-time Problem Solving Endpoints ──────────────────────────────────────

@router.post("/hint")
@limiter.limit("15/minute")
async def get_hint(request: Request, body: dict):
    """Get an AI hint while answering a question."""
    session_id = body.get("session_id")
    question_id = body.get("question_id")
    partial_answer = body.get("partial_answer", "")
    hint_number = body.get("hint_number", 1)

    session = _get_session_or_404(session_id)
    questions = session.get("questions", [])

    question = next((q for q in questions if q.get("id") == question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if hint_number > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 hints per question")

    # Track hints used
    hints_used = session.get("hints_used", {})
    q_key = str(question_id)
    hints_used.setdefault(q_key, 0)
    hints_used[q_key] = max(hints_used[q_key], hint_number)
    storage.update_session(session_id, "hints_used", hints_used)

    try:
        result = await generate_hint(
            question.get("text", ""),
            question.get("skill_tested", ""),
            partial_answer,
            hint_number,
        )
    except Exception as e:
        logger.error(f"Hint error: {e}")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    result["hint_number"] = hint_number
    result["hints_remaining"] = 3 - hint_number
    return result


@router.post("/followup")
@limiter.limit("10/minute")
async def get_followup(request: Request, body: dict):
    """Generate a follow-up question based on the candidate's answer."""
    session_id = body.get("session_id")
    question_id = body.get("question_id")

    session = _get_session_or_404(session_id)
    questions = session.get("questions", [])
    evaluations = session.get("evaluations", [])

    question = next((q for q in questions if q.get("id") == question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    evaluation = next((e for e in evaluations if e.get("question_id") == question_id), None)
    if not evaluation:
        raise HTTPException(status_code=400, detail="Answer this question first")

    try:
        result = await generate_followup(
            question.get("text", ""),
            evaluation.get("answer", ""),
            evaluation.get("score", 5),
            question.get("skill_tested", ""),
            evaluation.get("approach_rating", "adequate"),
        )
    except Exception as e:
        logger.error(f"Followup error: {e}")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    # Store as follow-up in session
    followups = session.get("followups", [])
    followups.append({
        "question_id": question_id,
        "followup": result,
    })
    storage.update_session(session_id, "followups", followups)

    return result


@router.post("/code-challenge")
@limiter.limit("5/minute")
async def code_challenge(request: Request, body: dict):
    """Generate a code challenge based on the candidate's resume."""
    session_id = body.get("session_id")
    session = _get_session_or_404(session_id)
    resume_data = session.get("resume_data")
    if not resume_data:
        raise HTTPException(status_code=400, detail="No resume data in session")

    try:
        challenge = await generate_code_challenge(resume_data)
    except Exception as e:
        logger.error(f"Code challenge error: {e}")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    storage.update_session(session_id, "code_challenge", challenge)
    return challenge


@router.post("/code-evaluate")
@limiter.limit("10/minute")
async def code_evaluate(request: Request, body: dict):
    """Evaluate the candidate's code submission."""
    session_id = body.get("session_id")
    code = body.get("code", "")

    session = _get_session_or_404(session_id)
    challenge = session.get("code_challenge")
    if not challenge:
        raise HTTPException(status_code=400, detail="No code challenge found. Generate one first.")

    try:
        result = await evaluate_code(challenge, code)
    except Exception as e:
        logger.error(f"Code eval error: {e}")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    # Store the code evaluation
    storage.update_session(session_id, "code_evaluation", {
        "code": code[:2000],
        **result,
    })

    return result
