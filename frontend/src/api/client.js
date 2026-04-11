import axios from 'axios'

const api = axios.create({
  baseURL: 'https://roast-7n43.onrender.com/api',
  timeout: 60000,
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status
    const message = err.response?.data?.detail || err.message || 'Something went wrong'
    
    // Auto-recovery for Session Not Found (happens after backend restart/deploy)
    if (status === 404 && (message.toLowerCase().includes('session') || message.toLowerCase().includes('not found'))) {
      localStorage.removeItem('devroast_session')
      window.location.href = '/' // Bounce back to start
      return new Promise(() => {}) // Stop promise chain
    }

    // Rate limit handling
    if (status === 429) {
      alert("🔥 Too many roasts! Our AI is on fire. Please wait a minute before trying again.")
      return new Promise(() => {})
    }

    return Promise.reject(new Error(message))
  }
)

export const uploadResume = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/resume/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}

export const getInitialRoast = (sessionId, intensity = 'medium') =>
  api.post('/roast/initial', { session_id: sessionId, intensity })

export const startInterview = (sessionId, questionCount = 5, intensity = 'medium') =>
  api.post('/roast/questions', { session_id: sessionId, question_count: questionCount, intensity })

export const evaluateAnswer = (sessionId, questionId, questionText, skillTested, answer) =>
  api.post('/roast/evaluate', {
    session_id: sessionId,
    question_id: questionId,
    question_text: questionText,
    skill_tested: skillTested,
    answer,
  })

export const getFinalRoast = (sessionId, intensity = 'medium') =>
  api.post('/roast/final', { session_id: sessionId, intensity })

export const getFixPlan = (sessionId) =>
  api.post('/roast/fixplan', { session_id: sessionId })

export const submitToLeaderboard = (sessionId, displayName) =>
  api.post('/leaderboard/submit', { session_id: sessionId, display_name: displayName })

export const getLeaderboard = (limit = 20) =>
  api.get(`/leaderboard/?limit=${limit}`)

export const generateShare = (sessionId, displayName) =>
  api.post('/share/generate', { session_id: sessionId, display_name: displayName })

export const getSharedResult = (shareId) =>
  api.get(`/share/${shareId}`)

export const challengeCompare = (challengerShareId, sessionId) =>
  api.post('/share/challenge', { challenger_share_id: challengerShareId, session_id: sessionId })

export const getHint = (sessionId, questionId, partialAnswer = '', hintNumber = 1) =>
  api.post('/roast/hint', { session_id: sessionId, question_id: questionId, partial_answer: partialAnswer, hint_number: hintNumber })

export const getFollowup = (sessionId, questionId) =>
  api.post('/roast/followup', { session_id: sessionId, question_id: questionId })

export const getCodeChallenge = (sessionId) =>
  api.post('/roast/code-challenge', { session_id: sessionId })

export const evaluateCode = (sessionId, code) =>
  api.post('/roast/code-evaluate', { session_id: sessionId, code })

export const submitFeedback = (sessionId, rating, message = '', displayName = '') =>
  api.post('/feedback/submit', { session_id: sessionId, rating, message, display_name: displayName })

export const getFeedback = (limit = 20) =>
  api.get(`/feedback/?limit=${limit}`)
