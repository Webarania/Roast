# Project Documentation: Dev Roast AI
**Date**: April 2026
**Lead Developer**: Gemini CLI (AI Agent) for Webarania

---

## 1. Project Overview
Dev Roast AI is a gamified technical assessment platform. Unlike traditional coding tests, it uses AI to "roast" a user's resume and then conducts a high-pressure, scenario-based interview. The goal is to separate developers who have actual experience from those who only have buzzwords on their resumes.

## 2. Tools & Technologies Used
### **Development**
- **Gemini CLI**: Used as the primary coding and refactoring partner. Fulfills the role of a senior full-stack engineer.
- **VS Code**: Integrated development environment.
- **Git/GitHub**: Version control and CI/CD triggers.

### **Frontend**
- **React (Vite)**: For a lightning-fast, modern UI.
- **Framer Motion**: For cinematic animations and transitions.
- **Tailwind CSS**: For responsive, modern styling.
- **Web Speech API**: For voice-to-text integration.

### **Backend**
- **FastAPI**: High-performance Python framework for building the API.
- **Uvicorn**: ASGI server for running the FastAPI app.
- **SlowAPI**: For rate-limiting to prevent API abuse.

### **Artificial Intelligence**
- **Groq (Llama 3.3)**: Primary LLM for high-speed roast and question generation.
- **Google Gemini 2.0**: Fallback LLM for high-reliability parsing and evaluation.

### **Hosting**
- **Render**: Used for hosting the FastAPI backend (with automated GitHub deployments).
- **Hostinger**: Used for hosting the React frontend build.

---

## 3. Step-by-Step Creation Process

### **Phase 1: Project Rescue & Audit**
The project started with an existing codebase that had connectivity issues and malformed AI responses.
- **Step 1**: Conducted a full audit of `backend/main.py` and `frontend/src/api/client.js`.
- **Step 2**: Corrected the proxy configuration in `vite.config.js` to point to the Render production backend.

### **Phase 2: AI Gateway Refactoring**
To ensure the app never crashes due to an API outage, we built a robust AI Gateway.
- **Step 1**: Implemented `ai_call` with automatic fallback from Groq to Gemini.
- **Step 2**: Created a `safe_join` utility to handle nested data structures extracted by the AI.
- **Step 3**: Rebuilt the JSON extraction logic (`extract_json`) to handle "chatty" LLM responses that include markdown code fences.

### **Phase 3: UI/UX Upgrades**
Implemented viral marketing features and better navigation.
- **Step 1**: Added the "Webarania Teaser Section" with an animated progress bar to drive Instagram followers.
- **Step 2**: Added "Back to Home" navigation across all screens to prevent user "dead-ends".
- **Step 3**: Integrated **Voice-to-Text** using the browser's microphone API to make the interview more interactive.

### **Phase 4: Persistence & Anti-Cheat**
- **Step 1**: Replaced in-memory dictionaries with a JSON file-based storage engine in `backend/storage.py` to persist leaderboards across server restarts.
- **Step 2**: Implemented `onPaste` restrictions in the interview answer box to prevent users from using external AI tools like Claude or ChatGPT easily.

### **Phase 5: Social Viral Loop**
- **Step 1**: Developed a unique share link generator that creates per-user result pages.
- **Step 2**: Integrated specific sharing buttons for Twitter, LinkedIn (with unique URL encoding), and Instagram (with auto-copy to clipboard).

---

## 4. Key Prompts Used (Gemini CLI)
- *"Read this project and correct the issues where the backend is not connecting to the frontend."*
- *"Refactor the ai_gateway to use Gemini as a fallback if Groq fails."*
- *"The AI evaluation is returning empty roasts. Fix the JSON extraction logic to be more aggressive."*
- *"Add a Webarania teaser section after 'How it Works' with a progress bar for 50k followers."*
- *"Disable paste in the answer box and add a mic button for voice-to-text functionality."*
- *"Make the roasts more savage. Tell them they are only eligible for school teacher jobs if they fail."*

---

## 5. Issues Faced & Resolutions

### **1. AI Service Error: "sequence item 0: expected str instance, dict found"**
- **Issue**: The AI was extracting skills as dictionaries (e.g., `{"name": "React"}`) but the code expected a list of strings.
- **Resolution**: Created a `safe_join` function that recursively checks for dictionaries and extracts the string labels before joining.

### **2. Session Loss on Render**
- **Issue**: Render's free tier restarts periodically, wiping all active interview sessions.
- **Resolution**: Implemented JSON-based local persistence and a frontend auto-recovery interceptor that bounces users back to the start if a 404 (Session Not Found) occurs.

### **3. LinkedIn Sharing Limitations**
- **Issue**: LinkedIn's API does not allow pre-filling the post text from a web link.
- **Resolution**: Updated the UI to "Copy Roast Text" automatically when clicking share, allowing the user to simply Paste and Post.

### **4. Git Permissions on Mac**
- **Issue**: "Dubious ownership" error prevented pushing to GitHub.
- **Resolution**: Used `chown` to fix directory ownership and added the path to `git safe.directory`.

---

## 6. Final Deployment
The project is now fully functional.
1.  **Backend** is deployed on Render, listening for GitHub pushes.
2.  **Frontend** is built using `npm run build` and the `dist` folder is uploaded to Hostinger.
3.  **API Keys** are stored securely in Render's environment variables.

---
**Document generated by Gemini CLI**
"Your AI Engineering Partner"
