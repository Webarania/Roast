import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import FRONTEND_URL
from routers import feedback, leaderboard, resume, roast, share
import storage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Dev Roast AI",
    description="Viral gamified AI platform that exposes fake developer skills",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."},
    )


# Include routers
app.include_router(resume.router, prefix="/api/resume", tags=["Resume"])
app.include_router(roast.router, prefix="/api/roast", tags=["Roast & Interview"])
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["Leaderboard"])
app.include_router(share.router, prefix="/api/share", tags=["Share"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["Feedback"])


@app.on_event("startup")
async def startup_event():
    logger.info(f"Dev Roast AI starting up. Active sessions: {storage.get_session_count()}")


@app.get("/")
async def root():
    return {"status": "Dev Roast AI is running 🔥", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {
        "status": "ok", 
        "database": "connected" if storage.USE_MONGO else "fallback_mode (local/memory)",
        "db_error": storage.MONGO_ERROR
    }


@app.post("/admin/cleanup-duplicates")
async def cleanup_duplicates():
    """Remove duplicate leaderboard entries. Keeps the latest entry per person."""
    result = storage.cleanup_duplicate_leaderboard()
    logger.info(f"Leaderboard cleanup: removed {result['removed']}, remaining {result['remaining']}")
    return result


@app.get("/stats")
async def stats():
    """Return real server stats from DB."""
    total_db_roasted = storage.get_session_count()
    share_count = storage.get_share_count()

    # Calculate real rate based purely on DB data
    share_rate = 0
    if total_db_roasted > 0:
        share_rate = round((share_count / total_db_roasted) * 100)

    avg_session = storage.get_avg_session_time()

    return {
        "devs_roasted": total_db_roasted,
        "share_rate": share_rate,
        "avg_session": avg_session,
        "active_sessions": total_db_roasted,
    }
