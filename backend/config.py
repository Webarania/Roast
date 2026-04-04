import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
MONGODB_URI = os.getenv("MONGODB_URI", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GEMINI_MODEL = "gemini-2.0-flash"
GROQ_MODEL = "llama-3.3-70b-versatile"
MAX_FILE_SIZE_MB = 2
