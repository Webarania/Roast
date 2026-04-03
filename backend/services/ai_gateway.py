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
        "temperature": 0.7,
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
            temperature=0.7,
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
    if not text:
        raise ValueError("Empty response from AI")
        
    # Try to find JSON in code fences
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        text = match.group(1)

    # Clean up common AI artifacts
    text = text.strip()
    
    # Try raw JSON object/array
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Find first { or [
        for start_char, end_char in [('{', '}'), ('[', ']')]:
            start = text.find(start_char)
            if start != -1:
                # Find matching end
                depth = 0
                for i in range(start, len(text)):
                    c = text[i]
                    if c == start_char:
                        depth += 1
                    elif c == end_char:
                        depth -= 1
                        if depth == 0:
                            try:
                                return json.loads(text[start:i+1])
                            except json.JSONDecodeError:
                                break
        raise ValueError(f"Could not extract JSON from: {text[:200]}...")

def safe_join(items: Any, sep: str = ", ") -> str:
    """Safely join items that might be strings or dicts."""
    if not items:
        return ""
    if not isinstance(items, list):
        return str(items)
    
    str_items = []
    for item in items:
        if isinstance(item, dict):
            # Try common name keys
            name = item.get("name") or item.get("title") or item.get("skill") or item.get("text")
            if not name and item.values():
                name = list(item.values())[0]
            str_items.append(str(name or item))
        else:
            str_items.append(str(item))
    return sep.join(str_items)

# ─── API Implementation ──────────────────────────────────────────────────────

async def parse_resume(resume_text: str) -> Dict:
    prompt = f"""
    Extract structured technical info from this resume text.
    Resume:
    {resume_text[:4000]}

    Return ONLY valid JSON with this structure:
    {{
      "name": "Developer Name",
      "job_title": "Current Role",
      "domain": "e.g. Frontend, Backend",
      "skills": ["Python", "React"],
      "projects": [{{"name": "P1", "description": "...", "tech_stack": ["Node"]}}],
      "experience_level": "junior|mid|senior",
      "years_of_experience": 3
    }}
    """
    raw = await ai_call(prompt, system="Technical resume parser. Return only valid JSON.", timeout=20.0)
    return extract_json(raw)

async def generate_initial_roast(resume_data: dict, intensity: str = "medium") -> Dict:
    style = "gentle teasing" if intensity == "mild" else "brutal and unforgiving" if intensity == "savage" else "sarcastic and witty"
    
    prompt = f"""
    Roast this dev resume. Tone: {style}.
    Name: {resume_data.get('name')}
    Skills: {safe_join(resume_data.get('skills'))}
    Experience: {resume_data.get('experience_level')}
    
    Return ONLY valid JSON:
    {{
      "roast": "Brutal 2-4 line verdict",
      "weak_skills": ["skill1"],
      "strong_skills": ["skill2"],
      "red_flags": ["flag1"]
    }}
    """
    raw = await ai_call(prompt, system="Brutally funny tech interviewer. Return JSON.", timeout=15.0)
    return extract_json(raw)

async def generate_questions(resume_data: dict, count: int = 5, intensity: str = "medium") -> list:
    prompt = f"""
    Generate {count} real-world, scenario-based interview questions for a {resume_data.get('experience_level')} dev.
    Skills: {safe_join(resume_data.get('skills'))}
    Intensity: {intensity}
    
    Return ONLY valid JSON array of objects:
    [
      {{
        "id": 1,
        "text": "Full question text",
        "skill_tested": "Primary skill",
        "difficulty": "easy|medium|hard",
        "category": "debug|system_design|code_review",
        "context": "Why this is relevant to their resume"
      }}
    ]
    """
    raw = await ai_call(prompt, system="Senior tech interviewer. Scenario-based only. Return JSON array.", timeout=20.0)
    return extract_json(raw)

async def evaluate_answer(question: str, skill: str, answer: str) -> Dict:
    if not answer or len(answer.strip()) < 5:
        return {
            "score": 0,
            "mini_roast": "Silence? Bold move. You're clearly bluffing. 😬",
            "is_bluffing": True,
            "feedback": "You didn't actually provide an answer.",
            "approach_rating": "missing",
            "key_missing": "An actual answer"
        }
    
    prompt = f"""
    Evaluate this interview answer as a senior tech lead.
    Question: {question}
    Candidate Answer: {answer}
    Skill Tested: {skill}

    Return ONLY valid JSON:
    {{
      "score": <0-10 integer>,
      "mini_roast": "Short funny comment about the answer",
      "is_bluffing": <true if answer is fabricated/copied/vague>,
      "feedback": "2-3 sentences of constructive feedback",
      "approach_rating": "strong|adequate|weak|missing",
      "key_missing": "The most important thing they missed"
    }}
    """
    raw = await ai_call(prompt, system="Tough tech evaluator. Return JSON.", timeout=12.0)
    result = extract_json(raw)
    result["score"] = max(0, min(10, int(result.get("score", 0))))
    return result

async def generate_final_roast(session: dict) -> Dict:
    evals = session.get("evaluations", [])
    avg = sum(e.get("score", 0) for e in evals) / len(evals) if evals else 0
    
    prompt = f"""
    Generate the final verdict for {session.get('resume_data', {}).get('name')}.
    Avg Score: {avg}/10. 
    Summary: {safe_join([f"Q: {e.get('skill')} (Score: {e.get('score')}/10)" for e in evals])}
    
    Return ONLY valid JSON:
    {{
      "final_roast": "Final 3-5 line brutal paragraph",
      "fake_skills": ["skill1"],
      "verdict": "One-line summary"
    }}
    """
    raw = await ai_call(prompt, system="Final roast verdict mode. Return JSON.", timeout=15.0)
    return extract_json(raw)

async def generate_hint(question: str, skill: str, partial_answer: str, hint_number: int = 1) -> Dict:
    prompt = f"""
    The candidate is stuck on this question: {question}
    Skill: {skill}
    Current Answer: {partial_answer}
    Hint Number: {hint_number}/3

    Return ONLY valid JSON:
    {{
      "hint": "Small nudge toward the answer",
      "direction": "General area to think about"
    }}
    """
    raw = await ai_call(prompt, system="Helpful senior dev. Return JSON.", timeout=10.0)
    return extract_json(raw)

async def generate_followup(original_question: str, answer: str, score: int, skill: str, approach_rating: str = "adequate") -> Dict:
    prompt = f"""
    Ask a follow-up question based on this exchange:
    Original: {original_question}
    Answer: {answer}
    Score: {score}/10
    Skill: {skill}

    Return ONLY valid JSON:
    {{
      "followup_question": "Deep-dive question text",
      "why": "Why this follow-up is important"
    }}
    """
    raw = await ai_call(prompt, system="Interviewer deep-dive mode. Return JSON.", timeout=12.0)
    return extract_json(raw)

async def generate_code_challenge(resume_data: dict) -> Dict:
    prompt = f"""
    Generate a 5-min coding challenge for: {safe_join(resume_data.get('skills', []))}
    Experience Level: {resume_data.get('experience_level')}

    Return ONLY valid JSON:
    {{
      "title": "Challenge Title",
      "description": "Problem statement",
      "language": "JavaScript/Python/etc",
      "starter_code": "Code template",
      "examples": [{{"input": "...", "output": "..."}}]
    }}
    """
    raw = await ai_call(prompt, system="Practical code challenge generator. Return JSON.", timeout=15.0)
    return extract_json(raw)

async def evaluate_code(challenge: dict, code: str) -> Dict:
    prompt = f"""
    Evaluate this code for the challenge "{challenge.get('title')}".
    Code: {code}

    Return ONLY valid JSON:
    {{
      "score": <0-10>,
      "works": <bool>,
      "roast": "Funny comment",
      "feedback": "What to improve"
    }}
    """
    raw = await ai_call(prompt, system="Code reviewer mode. Return JSON.", timeout=15.0)
    return extract_json(raw)

async def generate_fix_plan(session: dict) -> Dict:
    prompt = f"Create learning fix plan for dev with skills: {safe_join(session.get('resume_data', {}).get('skills'))}"
    raw = await ai_call(prompt, system="Tech career coach. Return JSON.", timeout=15.0)
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
