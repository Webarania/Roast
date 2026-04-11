"""
AI Gateway — routes AI calls through Groq or Gemini with automatic fallback.
"""
import json
import re
import logging
import asyncio
import random
from typing import Any, Dict, Optional, List

import httpx
import google.generativeai as genai
from fastapi import HTTPException

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
        "temperature": 0.8, # Higher temperature for more variety
        "max_tokens": 1024,
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            resp = await client.post(
                f"{GROQ_BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
            )
            if resp.status_code == 429:
                raise HTTPException(status_code=429, detail="Groq API limit reached. Try again in a minute.")
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                raise HTTPException(status_code=429, detail="Too many requests to AI. Please slow down.")
            raise

async def call_gemini(prompt: str, system: str = "", timeout: float = 15.0) -> str:
    """Call Google Gemini API asynchronously."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured")

    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=system if system else None
    )
    
    try:
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.8,
                max_output_tokens=1024,
            )
        )
        return response.text
    except Exception as e:
        if "429" in str(e) or "ResourceExhausted" in str(e):
            raise HTTPException(status_code=429, detail="Gemini API limit reached. Try again in a minute.")
        raise

async def ai_call(prompt: str, system: str = "", timeout: float = 15.0) -> str:
    """Unified AI call with fallback: Groq -> Gemini."""
    errors = []
    
    # Try Groq first
    if GROQ_API_KEY:
        try:
            return await call_groq(prompt, system, timeout)
        except HTTPException as e:
            if e.status_code == 429:
                logger.warning("Groq rate limited, trying Gemini fallback...")
            else:
                errors.append(f"Groq: {str(e.detail)}")
        except Exception as e:
            logger.warning(f"Groq call failed, trying Gemini fallback: {e}")
            errors.append(f"Groq: {str(e)}")
            
    # Try Gemini fallback
    if GEMINI_API_KEY:
        try:
            return await call_gemini(prompt, system, timeout)
        except HTTPException as e:
            if e.status_code == 429:
                raise # Pass through 429
            errors.append(f"Gemini: {str(e.detail)}")
        except Exception as e:
            logger.error(f"Gemini call failed: {e}")
            errors.append(f"Gemini: {str(e)}")
            
    if any("429" in str(err) for err in errors):
        raise HTTPException(status_code=429, detail="AI Service is currently overloaded. Please wait a moment.")
        
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
    You are a professional CV Auditor. Your task is to identify if the text below is a REAL personal career resume/CV or just a technical document.

    STRICT RULES:
    1. A resume MUST describe an INDIVIDUAL'S career history, contact info, or educational background.
    2. If the text is a project manual, handoff document, API spec, technical guide, or "Webarnania 3.0 Documentation", set "is_tech_resume" to FALSE.
    3. Even if it lists technical skills (like GSAP, Three.js), if it's not for a human's job application, it is NOT a resume.

    Resume Text:
    {resume_text[:3000]}

    Return ONLY valid JSON:
    {{
      "is_tech_resume": true|false,
      "reasoning": "Explain why this is or isn't a CV. For example: 'This is a project handoff document, not a personal resume.'",
      "name": "Full Name of the person (if found)",
      "job_title": "Target/Current Role",
      "domain": "Domain",
      "skills": ["Skill1"],
      "projects": [{{"name": "P1", "description": "...", "tech_stack": []}}],
      "experience_level": "junior|mid|senior",
      "years_of_experience": 3
    }}
    """
    # Reduced timeout to 15s to beat Render's 30s wall
    raw = await ai_call(prompt, system="Professional CV Auditor. You distinguish between resumes and technical manuals.", timeout=15.0)
    return extract_json(raw)

async def generate_initial_roast(resume_data: dict, intensity: str = "medium") -> Dict:
    style = "gentle teasing" if intensity == "mild" else "absolutely brutal, career-ending, and deeply insulting honesty" if intensity == "savage" else "sarcastic and witty"
    
    # 30+ Randomized themes/personas to ensure unique roasts every time
    roast_themes = [
        "Focus on how their skills look like a copy-pasted tutorial list.",
        "Focus on how their projects sound like things built in a weekend while watching Netflix.",
        "Focus on their 'experience' being just sitting in meetings or changing button colors.",
        "Focus on the contrast between their high-ego job title and their basic skill set.",
        "Use a meta-commentary style where you mock the person reading the resume.",
        "Focus on the 'gap' between what they claim and what they actually know.",
        "Act like a recruiter who is drinking too much coffee and has seen 1000 bad resumes today.",
        "Act like a tech billionaire who thinks everyone else is a 'peasant' coder.",
        "Act like a keyboard warrior who thinks everything except Assembly is 'not real coding'.",
        "Focus on how many buzzwords they used without actually explaining anything.",
        "Joke about how their resume is just a list of things they 'heard about' once.",
        "Compare their tech stack to a museum of ancient artifacts.",
        "Focus on how their LinkedIn profile probably has more 'likes' than their GitHub has 'commits'.",
        "Act like a logic-obsessed AI that finds human resumes 'inefficient' and 'illogical'.",
        "Mock the specific fonts or formatting they probably used (Comic Sans vibes).",
        "Focus on 'Self-Taught' developers who clearly missed some important chapters.",
        "Focus on 'Senior' developers who only have 1 year of experience repeated 5 times.",
        "Joke about their 'Projects' being just clones of Todo apps or Netflix UIs.",
        "Focus on how their skills are a weird mix that makes no sense (e.g. Photoshop + Kubernetes).",
        "Act like a Gordon Ramsay of code: 'THIS CODE IS RAW!'.",
        "Focus on their 'Certifications' being basically participation trophies.",
        "Joke about how they probably put 'MS Word' in their skills section in 2026.",
        "Focus on how their resume is a cry for help from someone who hates their job.",
        "Mock their 'Soft Skills' section as a cover for their lack of 'Hard Skills'.",
        "Act like a cynical startup founder who only hires 'Rockstars' and 'Ninjas'.",
        "Focus on their GitHub having more forks than original ideas.",
        "Joke about how their 'Passion for coding' is actually just a 'Passion for a steady paycheck'.",
        "Compare their career path to a random number generator.",
        "Focus on how they list 'AI' because they used ChatGPT once to write an email.",
        "Act like a developer from the 70s who is confused by 'Cloud' and 'Web 3'."
    ]
    theme = random.choice(roast_themes)

    prompt = f"""
    Roast this tech professional's resume. Tone: {style}.
    Role: {resume_data.get('job_title')}
    Name: {resume_data.get('name')}
    Skills: {safe_join(resume_data.get('skills'))}
    Experience: {resume_data.get('experience_level')}
    
    Theme/Persona: {theme}

    IMPORTANT: Be creative and unpredictable. Do NOT use standard phrases like 'eligible for MNC' or 'school teacher'. 
    Make it feel like a unique person is roasting them. Use sarcasm, puns, and tech-specific insults.
    If savage, be devastatingly honest about their 'claimed' expertise.

    Return ONLY valid JSON:
    {{
      "roast": "Devastating but creative 2-4 line verdict",
      "weak_skills": ["skill1"],
      "strong_skills": ["skill2"],
      "red_flags": ["flag1"]
    }}
    """
    raw = await ai_call(prompt, system="Brutally funny tech industry interviewer. You have no filter but you are creative. Return JSON.", timeout=15.0)
    return extract_json(raw)

async def generate_questions(resume_data: dict, count: int = 5, intensity: str = "medium") -> list:
    # Use a random seed to vary question generation
    random_seed = random.randint(1, 1000)
    
    prompt = f"""
    Generate {count} UNIQUE real-world, scenario-based interview questions for a {resume_data.get('experience_level')} dev.
    Skills: {safe_join(resume_data.get('skills'))}
    Intensity: {intensity}
    Random Seed: {random_seed}
    
    Every question must be a PRACTICAL on-the-job scenario. 
    Examples: 'The server just crashed because of X, what do you do?', 'A client wants Y but Z is broken, how do you handle it?'.
    
    Return ONLY valid JSON array of objects:
    [
      {{
        "id": 1,
        "text": "Full question text",
        "skill_tested": "Primary skill",
        "difficulty": "easy|medium|hard",
        "category": "debug|system_design|code_review",
        "context": "Why this is relevant to their specific resume"
      }}
    ]
    """
    raw = await ai_call(prompt, system="Senior tech interviewer. Scenario-based only. No generic definitions. Return JSON array.", timeout=20.0)
    return extract_json(raw)

async def generate_mcqs(resume_data: dict, count: int = 5) -> list:
    """Generate multiple choice questions based on the resume skills."""
    random_seed = random.randint(1, 1000)
    
    prompt = f"""
    Generate {count} technical Multiple Choice Questions (MCQs) for this dev.
    Skills: {safe_join(resume_data.get('skills'))}
    Random Seed: {random_seed}
    
    These must be tough, technical questions, not basics. 
    
    Return ONLY valid JSON array:
    [
      {{
        "id": "mcq_1",
        "type": "mcq",
        "text": "The technical question text?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Exact text of the correct option",
        "skill_tested": "The specific skill",
        "difficulty": "medium|hard"
      }}
    ]
    """
    raw = await ai_call(prompt, system="MCQ Generator. Use variety. Return JSON array.", timeout=20.0)
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
    intensity = session.get("intensity", "medium")
    
    # Randomized themes for final roasts
    final_themes = [
        "Focus on how they should probably change careers to something non-technical.",
        "Focus on how they are just a 'copy-paste' engineer.",
        "Focus on how their skill gap is wider than the Grand Canyon.",
        "Focus on how they might survive in a company that doesn't care about quality.",
        "Focus on their specific blunders in the interview questions."
    ]
    theme = random.choice(final_themes)

    prompt = f"""
    Generate the final verdict for {session.get('resume_data', {}).get('name')}.
    Avg Score: {avg}/10. 
    Summary: {safe_join([f"Q: {e.get('skill')} (Score: {e.get('score')}/10)" for e in evals])}
    Intensity: {intensity}
    Theme: {theme}

    If intensity is savage, be absolutely devastating but creative. DO NOT use 'MNC' or 'school teacher' jokes. 
    Use fresh insults like 'A GPT-2 model has more logic', 'You write code like you're using a typewriter', or 'Your career is basically a series of successful bluffs'.

    Return ONLY valid JSON:
    {{
      "final_roast": "Final 3-5 line brutal paragraph",
      "fake_skills": ["skill1"],
      "verdict": "One-line summary verdict"
    }}
    """
    raw = await ai_call(prompt, system="Final roast verdict mode. Max creativity in roasting. Return JSON.", timeout=15.0)
    return extract_json(raw)

async def generate_hint(question: str, skill: str, partial_answer: str, hint_number: int = 1) -> Dict:
    # Randomize hint style
    hint_styles = ["Encouraging but vague", "Slightly mocking", "Technical and precise", "Analogy-based"]
    style = random.choice(hint_styles)
    
    prompt = f"""
    The candidate is stuck on this question: {question}
    Skill: {skill}
    Current Answer: {partial_answer}
    Hint Style: {style}

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
