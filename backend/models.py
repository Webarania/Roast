from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class ResumeData(BaseModel):
    session_id: str
    name: Optional[str] = "Developer"
    skills: List[str] = []
    projects: List[str] = []
    experience_level: str = "junior"
    raw_text: str = ""


class InitialRoastRequest(BaseModel):
    session_id: str
    intensity: str = "medium"


class InitialRoastResponse(BaseModel):
    roast: str
    weak_skills: List[str]
    strong_skills: List[str]
    red_flags: List[str] = []


class StartInterviewRequest(BaseModel):
    session_id: str
    question_count: int = 5
    intensity: str = "medium"


class Question(BaseModel):
    id: Any
    text: str
    skill_tested: str
    difficulty: str = "medium"


class InterviewQuestionsResponse(BaseModel):
    questions: List[Question]


class EvaluateAnswerRequest(BaseModel):
    session_id: str
    question_id: Any
    question_text: str
    skill_tested: str
    answer: str


class AnswerEvaluation(BaseModel):
    score: int
    mini_roast: str
    is_bluffing: bool
    feedback: str


class FinalRoastRequest(BaseModel):
    session_id: str
    intensity: str = "medium"


class FinalRoastResponse(BaseModel):
    total_score: int
    badge: str
    badge_title: str
    final_roast: str
    fake_skills: List[str]
    breakdown: Dict[str, Any]


class LeaderboardSubmitRequest(BaseModel):
    session_id: str
    display_name: str


class LeaderboardEntry(BaseModel):
    rank: int
    display_name: str
    score: int
    badge: str
    badge_title: str
    timestamp: str


class ShareRequest(BaseModel):
    session_id: str
    display_name: str


class ShareResponse(BaseModel):
    share_id: str
    share_url: str
    share_text: str


class FixPlanRequest(BaseModel):
    session_id: str


class FixPlanResponse(BaseModel):
    roadmap: List[Dict[str, Any]]
    resume_tips: List[str]
    priority_skills: List[str]


class ChallengeRequest(BaseModel):
    challenger_share_id: str
    session_id: str


class ChallengeResponse(BaseModel):
    challenger: Dict[str, Any]
    you: Dict[str, Any]
    winner: str
    score_diff: int
    roast: str
