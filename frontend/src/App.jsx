import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Landing from './components/Landing'
import ResumeUpload from './components/ResumeUpload'
import InitialRoast from './components/InitialRoast'
import InterviewMode from './components/InterviewMode'
import FinalScore from './components/FinalScore'
import Leaderboard from './components/Leaderboard'
import FixPlan from './components/FixPlan'
import SharedResult from './components/SharedResult'

const STORAGE_KEY = 'devroast_session'

function saveSession(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null }
}
function clearSession() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

function MainApp() {
  const [screen, setScreen]       = useState('landing')
  const [sessionId, setSessionId] = useState(null)
  const [resumeData, setResumeData] = useState(null)
  const [questions, setQuestions]  = useState([])
  const [intensity, setIntensity] = useState('medium')

  // Recover session from localStorage on mount
  useEffect(() => {
    const saved = loadSession()
    if (saved?.sessionId && saved?.screen) {
      setSessionId(saved.sessionId)
      setResumeData(saved.resumeData)
      setQuestions(saved.questions || [])
      setIntensity(saved.intensity || 'medium')
      setScreen(saved.screen)
    }
  }, [])

  // Persist session on changes
  useEffect(() => {
    if (sessionId && screen !== 'landing') {
      saveSession({ screen, sessionId, resumeData, questions, intensity })
    }
  }, [screen, sessionId, resumeData, questions, intensity])

  const handleUploadComplete = (data) => {
    if (!data) { setScreen('landing'); return }
    setSessionId(data.session_id)
    setResumeData(data.resume_data)
    setScreen('roast')
  }

  const handleStartInterview = (qs) => {
    setQuestions(qs)
    setScreen('interview')
  }

  const handleInterviewComplete = () => setScreen('final')

  const reset = () => {
    setScreen('landing')
    setSessionId(null)
    setResumeData(null)
    setQuestions([])
    setIntensity('medium')
    clearSession()
  }

  return (
    <div className="min-h-screen text-white" style={{ background: '#050505' }}>
      {screen === 'landing' && (
        <Landing onStart={() => setScreen('upload')} />
      )}
      {screen === 'upload' && (
        <ResumeUpload
          onComplete={handleUploadComplete}
          intensity={intensity}
          onIntensityChange={setIntensity}
        />
      )}
      {screen === 'roast' && sessionId && (
        <InitialRoast
          sessionId={sessionId}
          resumeData={resumeData}
          intensity={intensity}
          onStartInterview={handleStartInterview}
          onReset={reset}
        />
      )}
      {screen === 'interview' && sessionId && questions.length > 0 && (
        <InterviewMode
          sessionId={sessionId}
          questions={questions}
          onComplete={handleInterviewComplete}
          onReset={reset}
        />
      )}
      {screen === 'final' && sessionId && (
        <FinalScore
          sessionId={sessionId}
          resumeData={resumeData}
          intensity={intensity}
          onViewLeaderboard={() => setScreen('leaderboard')}
          onFixPlan={() => setScreen('fixplan')}
          onReset={reset}
        />
      )}
      {screen === 'leaderboard' && (
        <Leaderboard
          onBack={() => setScreen('final')}
          userSessionId={sessionId}
        />
      )}
      {screen === 'fixplan' && sessionId && (
        <FixPlan
          sessionId={sessionId}
          onBack={() => setScreen('final')}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/share/:shareId" element={<SharedResult />} />
      <Route path="*" element={<MainApp />} />
    </Routes>
  )
}
