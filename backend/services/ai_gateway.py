"""
AI Gateway — routes AI calls through Groq or Gemini with automatic fallback.
"""
import json
import re
import logging
import asyncio
from typing import Any, Dict, Optional, List

import httpx
import google.generativeai as genai

from config import (
    GROQ_API_KEY,
    GROQ_MODEL,
    GROQ_BASE_URL,
    GEMINI_API_KEY,
    GEMINI_MODEL,
)

logger = logging.getLogger(__name__)

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

async def call_groq(prompt: str, system: str = "", timeout: float = 15.0) -> str:
    """Call Groq API asynchronously (OpenAI-compatible)."""
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not configured")

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.8,
        "max_tokens": 1024,
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(
            f"{GROQ_BASE_URL}/chat/completions",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]

async def call_gemini(prompt: str, system: str = "", timeout: float = 15.0) -> str:
    """Call Google Gemini API asynchronously."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured")

    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=system if system else None
    )
    
    response = await model.generate_content_async(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.8,
            max_output_tokens=1024,
        )
    )
    return response.text

async def ai_call(prompt: str, system: str = "", timeout: float = 15.0) -> str:
    """Unified AI call with fallback: Groq -> Gemini."""
    errors = []
    
    # Try Groq first
    if GROQ_API_KEY:
        try:
            return await call_groq(prompt, system, timeout)
        except Exception as e:
            logger.warning(f"Groq call failed, trying Gemini fallback: {e}")
            errors.append(f"Groq: {str(e)}")
            
    # Try Gemini fallback
    if GEMINI_API_KEY:
        try:
            return await call_gemini(prompt, system, timeout)
        except Exception as e:
            logger.error(f"Gemini call failed: {e}")
            errors.append(f"Gemini: {str(e)}")
            
    raise RuntimeError(f"All AI providers failed or none configured. Errors: {'; '.join(errors)}")

def extract_json(text: str) -> Any:
    """Extract JSON from LLM response that may have markdown code fences."""
    # Try to find JSON in code fences
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        text = match.group(1)

    # Try to find raw JSON object/array
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Find first { or [
        for start_char, end_char in [('{', '}'), ('[', ']')]:
            start = text.find(start_char)
            if start != -1:
                # Find matching end
                depth = 0
                for i, c in enumerate(text[start:], start):
                    if c == start_char:
                        depth += 1
                    elif c == end_char:
                        depth -= 1
                        if depth == 0:
                            try:
                                return json.loads(text[start:i+1])
                            except json.JSONDecodeError:
                                break
        raise ValueError(f"Could not extract JSON from: {text[:200]}")

def safe_join(items: Any, sep: str = ", ") -> str:
    """Safely join items that might be strings or dicts."""
    if not items:
        return ""
    if not isinstance(items, list):
        return str(items)
    
    str_items = []
    for item in items:
        if isinstance(item, dict):
            # Try common name keys, or just use first value
            name = item.get("name") or item.get("title") or item.get("skill")
            if not name and item.values():
                name = list(item.values())[0]
            str_items.append(str(name or item))
        else:
            str_items.append(str(item))
    return sep.join(str_items)

# ─── Prompts & Instructions ──────────────────────────────────────────────────

RESUME_PARSE_PROMPT = """
You are a technical resume parser. Extract structured information from this resume text.

Resume:
{resume_text}

Return ONLY valid JSON (no markdown) with this exact structure:
{{
  "name": "Developer's name or null",
  "job_title": "Most recent job title",
  "domain": "Primary tech domain (e.g. 'Web Development', 'Data Science')",
  "skills": ["skill1", "skill2", ...],
  "projects": [
    {{
      "name": "Project name",
      "description": "1-line description",
      "tech_stack": ["React", "Node.js", ...]
    }}
  ],
  "experience_level": "junior|mid|senior",
  "years_of_experience": 2,
  "work_experience": ["Company — Role — key responsibility"]
}}
"""

INITIAL_ROAST_SYSTEM = """You are Dev Roast AI — a brutally funny, sarcastic tech interviewer who exposes fake developers.
Your roasts are clever, specific to their skills, and funny (not mean-spirited personally)."""

INTENSITY_INSTRUCTIONS = {
    "mild": "Be gently teasing, more encouraging than harsh",
    "medium": "Be sarcastic and funny but not mean",
    "savage": "Be absolutely brutal, no holds barred, maximum savagery",
}

QUESTIONS_SYSTEM = """You are a senior tech interviewer. You design scenario-based interview questions
that test REAL problem-solving ability, not textbook definitions."""

QUESTION_DIFFICULTY = {
    "mild": "Make scenarios simpler and more common. Use everyday debugging and basic design questions. Lean toward easy and medium.",
    "medium": "Mix of common and complex scenarios. Standard senior-level interview pressure. Include 1-2 hard scenarios.",
    "savage": "Use tricky edge cases, production-scale problems, and gotcha scenarios. Lean toward hard. Include questions that expose shallow knowledge.",
}

EVAL_SYSTEM = """You are Dev Roast AI — a tough but fair senior technical evaluator.
You evaluate problem-solving answers like a real tech lead would."""

# ─── API Implementation ──────────────────────────────────────────────────────

async def parse_resume(resume_text: str) -> Dict:
    prompt = RESUME_PARSE_PROMPT.format(resume_text=resume_text[:4000])
    raw = await ai_call(prompt, system="You are a technical resume parser. Return only valid JSON.", timeout=20.0)
    return extract_json(raw)

async def generate_initial_roast(resume_data: dict, intensity: str = "medium") -> Dict:
    intensity_instruction = INTENSITY_INSTRUCTIONS.get(intensity, INTENSITY_INSTRUCTIONS["medium"])
    prompt = f"""
    Roast this developer's resume. Be funny, sarcastic, and specific.
    Intensity: {intensity_instruction}
    Name: {resume_data.get('name', 'Dev')}
    Skills: {safe_join(resume_data.get('skills', []))}
    Projects: {safe_join(resume_data.get('projects', []))}
    Experience: {resume_data.get('experience_level', 'junior')}
    
    Return ONLY valid JSON:
    {{
      "roast": "2-4 line brutal but funny roast",
      "weak_skills": ["skill1", "skill2"],
      "strong_skills": ["skill1", "skill2"],
      "red_flags": ["flag 1", "flag 2"]
    }}
    """
    raw = await ai_call(prompt, system=INITIAL_ROAST_SYSTEM + f"\n{intensity_instruction}.", timeout=15.0)
    result = extract_json(raw)
    result.setdefault("red_flags", [])
    return result

async def generate_questions(resume_data: dict, count: int = 5, intensity: str = "medium") -> list:
    difficulty_instruction = QUESTION_DIFFICULTY.get(intensity, QUESTION_DIFFICULTY["medium"])
    prompt = f"""
    Generate {count} real-world, scenario-based technical interview questions.
    Title: {resume_data.get('job_title', 'Developer')}
    Skills: {safe_join(resume_data.get('skills', []))}
    Exp: {resume_data.get('experience_level')}
    Difficulty: {difficulty_instruction}
    
    Return ONLY valid JSON array:
    [
      {{
        "id": 1,
        "text": "Scenario-based question",
        "skill_tested": "Primary skill",
        "difficulty": "easy|medium|hard",
        "category": "debug|system_design|code_review|production_incident|implementation",
        "context": "Why relevant"
      }}
    ]
    """
    raw = await ai_call(prompt, system=QUESTIONS_SYSTEM, timeout=20.0)
    return extract_json(raw)

async def evaluate_answer(question: str, skill: str, answer: str) -> Dict:
    if not answer or len(answer.strip()) < 5:
        return {
            "score": 0, "mini_roast": "Silence is not an answer... 😬",
            "is_bluffing": True, "feedback": "Please provide an actual answer."
        }
    prompt = f"Evaluate this answer to the question: {question}\nAnswer: {answer[:1000]}\nSkill: {skill}"
    raw = await ai_call(prompt, system=EVAL_SYSTEM, timeout=12.0)
    result = extract_json(raw)
    result["score"] = max(0, min(10, int(result.get("score", 0))))
    return result

async def generate_final_roast(session: dict) -> Dict:
    resume = session.get("resume_data", {})
    evaluations = session.get("evaluations", [])
    intensity = session.get("intensity", "medium")
    avg_score = sum(e.get("score", 0) for e in evaluations) / len(evaluations) if evaluations else 0
    qa_summary = [f"Q{i+1}: {e.get('score',0)}/10" for i, e in enumerate(evaluations)]

    prompt = f"""
    Generate the final verdict.
    Name: {resume.get('name', 'Dev')}
    Avg Score: {avg_score}/10
    Summary: {qa_summary}
    Return ONLY valid JSON:
    {{
      "final_roast": "3-5 line final verdict",
      "fake_skills": ["skill1", "skill2"],
      "verdict": "Summary verdict"
    }}
    """
    raw = await ai_call(prompt, system=f"Dev Roast AI. Final verdict mode. {intensity}", timeout=15.0)
    return extract_json(raw)

async def generate_hint(question: str, skill: str, partial_answer: str, hint_number: int = 1) -> Dict:
    prompt = f"Give a small hint for this question: {question}\nSkill: {skill}\nCurrent answer: {partial_answer}\nHint #{hint_number}/3"
    raw = await ai_call(prompt, system="Give a small nudge, don't give the answer.", timeout=10.0)
    return extract_json(raw)

async def generate_followup(original_question: str, answer: str, score: int, skill: str, approach_rating: str = "adequate") -> Dict:
    prompt = f"Original: {original_question}\nAnswer: {answer}\nScore: {score}\nGenerate a deeper follow-up question."
    raw = await ai_call(prompt, system="Senior interviewer deep-dive mode.", timeout=12.0)
    return extract_json(raw)

async def generate_code_challenge(resume_data: dict) -> Dict:
    prompt = f"Generate a 5-min coding challenge for: {safe_join(resume_data.get('skills', []))}"
    raw = await ai_call(prompt, system="Generate a practical coding challenge in JSON.", timeout=15.0)
    return extract_json(raw)

async def evaluate_code(challenge: dict, code: str) -> Dict:
    prompt = f"Challenge: {challenge.get('title')}\nCode: {code}\nEvaluate correctness and quality."
    raw = await ai_call(prompt, system="Code reviewer mode.", timeout=15.0)
    return extract_json(raw)

async def generate_fix_plan(session: dict) -> Dict:
    resume = session.get("resume_data", {})
    prompt = f"Create a fix plan for {resume.get('name')}. Skills: {safe_join(resume.get('skills', []))}"
    raw = await ai_call(prompt, system="Tech career coach mode. Return only JSON.", timeout=15.0)
    return extract_json(raw)

async def generate_comparison_roast(challenger_name: str, challenger_score: int, your_name: str, your_score: int, winner: str) -> str:
    prompt = f"Compare {challenger_name} ({challenger_score}) and {your_name} ({your_score}). Winner: {winner}."
    return await ai_call(prompt, system="Funny tech roast comedian. One sentence.", timeout=8.0)

def calculate_final_score(evaluations: list) -> int:
    if not evaluations: return 0
    return round((sum(e.get("score", 0) for e in evaluations) / len(evaluations)) * 10)

def get_badge(score: int) -> tuple[str, str]:
    if score <= 40: return "beginner_bluffer", "Beginner Bluffer"
    if score <= 60: return "overconfident_dev", "Overconfident Dev"
    if score <= 80: return "skilled_developer", "Skilled Developer"
    return "top_engineer", "Top Engineer"
