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

# ─── Prompts & Instructions ──────────────────────────────────────────────────

RESUME_PARSE_PROMPT = """
Extract structured technical info from this resume text.
Resume:
{resume_text}

Return ONLY valid JSON:
{{
  "name": "Developer's name",
  "job_title": "Job title",
  "domain": "e.g. Web Development",
  "skills": ["skill1", "skill2"],
  "projects": [
    {{
      "name": "Project name",
      "description": "1-line description",
      "tech_stack": ["React"]
    }}
  ],
  "experience_level": "junior|mid|senior",
  "years_of_experience": 2
}}
"""

# ─── API Implementation ──────────────────────────────────────────────────────

async def parse_resume(resume_text: str) -> Dict:
    prompt = RESUME_PARSE_PROMPT.format(resume_text=resume_text[:4000])
    raw = await ai_call(prompt, system="Technical resume parser. Return only valid JSON.", timeout=20.0)
    return extract_json(raw)

async def generate_initial_roast(resume_data: dict, intensity: str = "medium") -> Dict:
    intensity_map = {
        "mild": "gentle teasing",
        "medium": "sarcastic and witty",
        "savage": "brutal and unforgiving"
    }
    style = intensity_map.get(intensity, "sarcastic")
    
    prompt = f"""
    Roast this dev resume. Tone: {style}.
    Name: {resume_data.get('name')}
    Skills: {safe_join(resume_data.get('skills'))}
    Exp: {resume_data.get('experience_level')}
    
    Return ONLY valid JSON:
    {{
      "roast": "Funny verdict",
      "weak_skills": ["skill1"],
      "strong_skills": ["skill2"],
      "red_flags": ["flag1"]
    }}
    """
    raw = await ai_call(prompt, system="Brutally funny tech interviewer. Return JSON.", timeout=15.0)
    return extract_json(raw)

async def generate_questions(resume_data: dict, count: int = 5, intensity: str = "medium") -> list:
    prompt = f"""
    Generate {count} scenario-based interview questions for a {resume_data.get('experience_level')} dev.
    Skills: {safe_join(resume_data.get('skills'))}
    Intensity: {intensity}
    
    Return ONLY valid JSON array of objects:
    [
      {{
        "id": 1,
        "text": "Question text",
        "skill_tested": "Skill",
        "difficulty": "easy|medium|hard",
        "category": "debug|system_design",
        "context": "Why relevant"
      }}
    ]
    """
    raw = await ai_call(prompt, system="Senior tech interviewer. Scenario-based only. Return JSON array.", timeout=20.0)
    return extract_json(raw)

async def evaluate_answer(question: str, skill: str, answer: str) -> Dict:
    if not answer or len(answer.strip()) < 5:
        return {
            "score": 0, "mini_roast": "Silence? Bold move.",
            "is_bluffing": True, "feedback": "Please answer the question."
        }
    prompt = f"Question: {question}\nAnswer: {answer}\nSkill: {skill}\nEvaluate as a senior tech lead."
    raw = await ai_call(prompt, system="Tough tech evaluator. Score 0-10. Return JSON.", timeout=12.0)
    return extract_json(raw)

async def generate_final_roast(session: dict) -> Dict:
    evals = session.get("evaluations", [])
    avg = sum(e.get("score", 0) for e in evals) / len(evals) if evals else 0
    
    prompt = f"""
    Final verdict for {session.get('resume_data', {}).get('name')}.
    Avg Score: {avg}/10. 
    Summary: {safe_join([f"Q: {e.get('score')}" for e in evals])}
    
    Return ONLY valid JSON:
    {{
      "final_roast": "Brutal final paragraph",
      "fake_skills": ["skill1"],
      "verdict": "One-line summary"
    }}
    """
    raw = await ai_call(prompt, system="Final roast verdict mode. Return JSON.", timeout=15.0)
    return extract_json(raw)

async def generate_hint(question: str, skill: str, partial_answer: str, hint_number: int = 1) -> Dict:
    prompt = f"Question: {question}\nSkill: {skill}\nCurrent: {partial_answer}\nHint #{hint_number}/3"
    raw = await ai_call(prompt, system="Helpful senior dev. Give a nudge, not the answer. Return JSON: {'hint': '...', 'direction': '...'}", timeout=10.0)
    return extract_json(raw)

async def generate_followup(original_question: str, answer: str, score: int, skill: str, approach_rating: str = "adequate") -> Dict:
    prompt = f"Original: {original_question}\nAnswer: {answer}\nScore: {score}\nSkill: {skill}\nAsk a deeper follow-up."
    raw = await ai_call(prompt, system="Interviewer deep-dive mode. Return JSON: {'followup_question': '...', 'why': '...'}", timeout=12.0)
    return extract_json(raw)

async def generate_code_challenge(resume_data: dict) -> Dict:
    prompt = f"Generate 5-min code challenge for: {safe_join(resume_data.get('skills', []))}"
    raw = await ai_call(prompt, system="Practical code challenge generator. Return JSON.", timeout=15.0)
    return extract_json(raw)

async def evaluate_code(challenge: dict, code: str) -> Dict:
    prompt = f"Challenge: {challenge.get('title')}\nCode: {code}\nEvaluate."
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
