import io
import logging

import pdfplumber
from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from slowapi import Limiter
from slowapi.util import get_remote_address

import storage
from config import MAX_FILE_SIZE_MB
from services.ai_gateway import parse_resume

router = APIRouter()
logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)


@router.post("/upload")
@limiter.limit("5/minute")
async def upload_resume(request: Request, file: UploadFile = File(...)):
    """Upload a PDF resume, parse it, and create a session."""

    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400, detail=f"File size exceeds {MAX_FILE_SIZE_MB}MB limit"
        )

    # Extract text from PDF
    try:
        pdf_text = ""
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pdf_text += text + "\n"
    except Exception as e:
        logger.error(f"PDF parsing error: {e}")
        raise HTTPException(status_code=400, detail="Could not read PDF. Please check the file.")

    if not pdf_text.strip():
        raise HTTPException(
            status_code=400, detail="PDF appears to be empty or contains no readable text"
        )

    # Parse resume with AI
    try:
        parsed = await parse_resume(pdf_text)
        
        # Stricter tech validation using AI's judgment
        if parsed.get("is_tech_resume") is False:
            raise HTTPException(
                status_code=400,
                detail="This doesn't look like a technical/developer resume. Please upload a relevant resume to get roasted properly."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI parsing error: {e}")
        # Fallback keyword check if AI fails
        tech_keywords = [
            "python", "javascript", "java", "react", "node", "sql", "api",
            "developer", "engineer", "software", "programming", "code", "git",
            "html", "css", "database", "framework", "backend", "frontend", "fullstack",
        ]
        text_lower = pdf_text.lower()
        if not any(kw in text_lower for kw in tech_keywords):
            raise HTTPException(
                status_code=400,
                detail="This doesn't look like a tech resume. Please upload a developer resume.",
            )
        
        parsed = {
            "name": "Developer",
            "skills": [],
            "projects": [],
            "experience_level": "junior",
        }

    # Create session
    session_id = storage.create_session()
    resume_data = {
        "name": parsed.get("name") or "Developer",
        "job_title": parsed.get("job_title", "Software Developer"),
        "domain": parsed.get("domain", "Software Development"),
        "skills": parsed.get("skills", [])[:20],
        "projects": parsed.get("projects", [])[:5],
        "experience_level": parsed.get("experience_level", "junior"),
        "years_of_experience": parsed.get("years_of_experience", 0),
        "work_experience": parsed.get("work_experience", [])[:3],
        "raw_text": pdf_text[:3000],
    }
    storage.update_session(session_id, "resume_data", resume_data)

    return {
        "session_id": session_id,
        "resume_data": resume_data,
        "message": "Resume parsed successfully",
    }
