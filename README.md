# 🔥 Dev Roast AI

**Dev Roast AI** is a viral, gamified AI platform designed to expose fake developer skills. It parses technical resumes, delivers a brutal initial roast, and then puts the candidate through a real-world, scenario-based interview. If they survive, they get a badge, a final roast, and a spot on the global leaderboard.

## 🚀 Live Demo
- **Frontend:** Hosted on Hostinger
- **Backend:** [https://roast-7n43.onrender.com](https://roast-7n43.onrender.com)

## ✨ Key Features
- **AI Resume Parsing**: Extracts skills, projects, and red flags from PDF resumes.
- **Dynamic Interviewing**: Generates real-world technical scenarios based on the user's specific tech stack.
- **Voice-to-Text (🎤)**: Integrated speech recognition for answering interview questions.
- **Anti-Cheating**: Disabled copy-paste in answer boxes to ensure authentic responses.
- **Multi-AI Fallback**: Powered by **Groq (Llama 3.3)** with automatic fallback to **Google Gemini 2.0**.
- **Social Sharing**: Unique shareable links for LinkedIn, Twitter, and Instagram Stories.
- **Persistence**: Session data and leaderboards are persisted via a JSON-based storage engine.

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Axios.
- **Backend**: FastAPI (Python), Uvicorn, SlowAPI (Rate Limiting).
- **AI/LLM**: Groq API, Google Generative AI SDK.
- **Deployment**: Render (Backend), Hostinger (Frontend).

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- API Keys for Groq and/or Gemini.

### Local Development

1. **Clone the Repo:**
   ```bash
   git clone https://github.com/Webarania/Roast.git
   cd Roast
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate # or venv\Scripts\activate on Windows
   pip install -r requirements.txt
   # Create a .env file with your GROQ_API_KEY and GEMINI_API_KEY
   uvicorn main:app --reload
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 🧠 Developed with Gemini
This project was developed and refactored using **Gemini CLI**, an advanced AI software engineering agent. Gemini assisted in architectural design, debugging complex AI response parsing, and implementing real-time features like voice-to-text and social sharing.

---
Built with 🔥 by the **Webarania** Community.
Follow us on Instagram: [@webarania.wand](https://www.instagram.com/webarania.wand/)
