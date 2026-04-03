import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { evaluateAnswer, getHint, getFollowup } from '../api/client'

/* SVG circular progress */
function CircularScore({ score, size = 100 }) {
  const r = 42
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(score / 10, 1))
  const dashoffset = circ * (1 - pct)
  const color = score >= 8 ? '#4ade80' : score >= 5 ? '#fbbf24' : '#f87171'
  return (
    <motion.svg width={size} height={size} viewBox="0 0 100 100"
      initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <motion.circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: dashoffset }}
        transition={{ duration: 1.2, ease: [0.25,1,0.5,1], delay: 0.2 }}
        transform="rotate(-90 50 50)" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      <motion.text x="50" y="50" textAnchor="middle" dominantBaseline="central"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        fill={color} fontSize="22" fontWeight="800" fontFamily="Inter, sans-serif">{score}</motion.text>
    </motion.svg>
  )
}

const scoreLabel = (s) => {
  if (s >= 9) return { text: 'Excellent', icon: '🔥' }
  if (s >= 7) return { text: 'Good',      icon: '✅' }
  if (s >= 5) return { text: 'Partial',   icon: '😅' }
  if (s >= 3) return { text: 'Weak',      icon: '❌' }
  return { text: 'Wrong', icon: '💀' }
}
const scoreColor = (s) => s >= 8 ? '#4ade80' : s >= 5 ? '#fbbf24' : '#f87171'

const DIFFICULTY_META = {
  easy:   { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.3)',  label: 'Easy' },
  medium: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)',  label: 'Medium' },
  hard:   { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', label: 'Hard' },
}

function Timer({ seconds, paused }) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => { setLeft(seconds) }, [seconds])
  useEffect(() => {
    if (paused || left <= 0) return
    const t = setInterval(() => setLeft(l => l <= 1 ? (clearInterval(t), 0) : l - 1), 1000)
    return () => clearInterval(t)
  }, [paused, seconds])
  const pct = (left / seconds) * 100
  const color = left > 15 ? '#4ade80' : left > 5 ? '#fbbf24' : '#f87171'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '60px', height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <motion.div style={{ height: '100%', borderRadius: '4px', background: color, boxShadow: `0 0 6px ${color}` }}
          animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 700, color, fontFamily: 'monospace', minWidth: '28px' }}>{left}s</span>
    </div>
  )
}

export default function InterviewMode({ sessionId, questions, onComplete, onReset }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer,       setAnswer]       = useState('')
  const [evaluating,   setEvaluating]   = useState(false)
  const [evalResult,   setEvalResult]   = useState(null)
  const [allEvals,     setAllEvals]     = useState([])
  const [error,        setError]        = useState('')
  const [direction,    setDirection]    = useState(1)
  const [timerKey,     setTimerKey]     = useState(0)

  // Hint state
  const [hints,        setHints]        = useState([])
  const [hintLoading,  setHintLoading]  = useState(false)
  const [hintsUsed,    setHintsUsed]    = useState(0)

  // Follow-up state
  const [followup,       setFollowup]       = useState(null)
  const [followupAnswer, setFollowupAnswer] = useState('')
  const [followupEval,   setFollowupEval]   = useState(null)
  const [followupLoading,setFollowupLoading]= useState(false)
  const [showFollowup,   setShowFollowup]   = useState(false)

  const current  = questions[currentIndex]
  const isLast   = currentIndex === questions.length - 1
  const progress = ((currentIndex) / questions.length) * 100
  const diff = DIFFICULTY_META[current?.difficulty] || DIFFICULTY_META.medium

  const handleSubmit = async () => {
    if (!answer.trim() && !window.confirm("Submit empty answer? That's brave...")) return
    setEvaluating(true)
    setError('')
    try {
      const result = await evaluateAnswer(sessionId, current.id, current.text, current.skill_tested, answer.trim())
      setEvalResult(result)
      setAllEvals(prev => [...prev, result])
    } catch (err) {
      setError(err.message)
      setEvaluating(false)
    }
  }

  const handleHint = async () => {
    if (hintsUsed >= 3 || hintLoading) return
    setHintLoading(true)
    try {
      const result = await getHint(sessionId, current.id, answer, hintsUsed + 1)
      setHints(prev => [...prev, result])
      setHintsUsed(n => n + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setHintLoading(false)
    }
  }

  const handleFollowup = async () => {
    setFollowupLoading(true)
    try {
      const result = await getFollowup(sessionId, current.id)
      setFollowup(result)
      setShowFollowup(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setFollowupLoading(false)
    }
  }

  const handleFollowupSubmit = async () => {
    if (!followupAnswer.trim()) return
    setFollowupLoading(true)
    try {
      const result = await evaluateAnswer(
        sessionId, current.id,
        followup.followup_question,
        current.skill_tested,
        followupAnswer.trim()
      )
      setFollowupEval(result)
      // Blend follow-up score into overall
      setAllEvals(prev => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last) {
          last.followup_score = result.score
          last.combined_score = Math.round((last.score + result.score) / 2)
        }
        return copy
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setFollowupLoading(false)
    }
  }

  const handleNext = () => {
    setDirection(1)
    if (isLast) {
      onComplete(allEvals)
    } else {
      setCurrentIndex(i => i + 1)
      setAnswer('')
      setEvalResult(null)
      setEvaluating(false)
      setError('')
      setTimerKey(k => k + 1)
      setHints([])
      setHintsUsed(0)
      setFollowup(null)
      setFollowupAnswer('')
      setFollowupEval(null)
      setShowFollowup(false)
    }
  }

  const slideVariants = {
    enter:  (d) => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22,1,0.36,1] } },
    exit:   (d) => ({ opacity: 0, x: d > 0 ? -60 : 60, transition: { duration: 0.25 } }),
  }

  const label = evalResult ? scoreLabel(evalResult.score) : null

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 relative">
      <div className="particles-container opacity-30" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="particle" />)}
      </div>

      {/* Back to Home */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }} 
        animate={{ opacity: 1, x: 0 }}
        style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 20 }}
      >
        <button 
          onClick={onReset}
          style={{ 
            background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', 
            fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' 
          }}
          onMouseOver={e => e.target.style.color = '#fff'}
          onMouseOut={e => e.target.style.color = '#4b5563'}
        >
          ← Back to Home
        </button>
      </motion.div>

      {/* Progress Bar */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl mb-6 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-mono font-semibold">Question {currentIndex + 1} / {questions.length}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: diff.bg, border: `1px solid ${diff.border}`, color: diff.color }}>{diff.label}</span>
          </div>
          <div className="flex items-center gap-3">
            {!evalResult && !evaluating && (
              <Timer key={`timer-${currentIndex}-${timerKey}`} seconds={45} paused={!!evalResult || evaluating} />
            )}
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,69,0,0.1)', border: '1px solid rgba(255,69,0,0.25)', color: '#ff6b35' }}>{current.skill_tested}</span>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div className="h-full progress-bar-glow" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
        </div>
        <div className="flex gap-2 mt-3 justify-center">
          {questions.map((_, i) => (
            <motion.div key={i} animate={{ scale: i === currentIndex ? 1.3 : 1 }}
              className={`step-dot ${i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending'}`} />
          ))}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="w-full max-w-2xl relative z-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={currentIndex} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit">

            {/* Question Card */}
            <div className="card mb-4 relative overflow-hidden" style={{ background: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 0 30px rgba(255,69,0,0.08)' }}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #ff4500 0%, #ff8c00 50%, transparent 100%)' }} />
              <div className="flex items-start gap-4 pt-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: 'rgba(255,69,0,0.12)', color: '#ff4500', border: '1px solid rgba(255,69,0,0.25)' }}>Q{currentIndex + 1}</div>
                <div className="flex-1">
                  <p className="text-white font-semibold leading-relaxed text-base sm:text-lg">{current.text}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="chip-fire">{current.skill_tested}</span>
                    {current.category && (
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {current.category?.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  {current.context && (
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', fontStyle: 'italic' }}>💡 {current.context}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Answer Area */}
            {!evalResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                {/* Hints Display */}
                <AnimatePresence>
                  {hints.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-3 space-y-2">
                      {hints.map((h, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                          style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)', fontSize: '13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '14px' }}>💡</span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>Hint {i + 1}</span>
                            {h.direction && <span style={{ fontSize: '10px', color: '#6b7280' }}>— {h.direction}</span>}
                          </div>
                          <p style={{ color: '#93c5fd', margin: 0 }}>{h.hint}</p>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative">
                  <textarea value={answer} onChange={e => setAnswer(e.target.value)} disabled={evaluating}
                    placeholder="Type your answer... Think through the problem step by step."
                    rows={6}
                    className="w-full rounded-xl p-4 text-white placeholder-gray-600 font-mono text-sm resize-none transition-all duration-200 disabled:opacity-50 focus:outline-none"
                    style={{
                      background: 'rgba(8,8,8,0.95)',
                      border: answer.length > 20 ? '1px solid rgba(74,222,128,0.3)' : answer.length > 0 ? '1px solid rgba(251,191,36,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    }} />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    {answer.length > 0 && answer.length < 20 && <span className="text-xs text-yellow-500 font-mono">⚠️ too short</span>}
                    <span className="text-xs text-gray-600 font-mono">{answer.length}</span>
                  </div>
                </div>

                {error && (
                  <div className="mt-3 p-3 rounded-xl text-red-400 text-sm font-medium" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)' }}>{error}</div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  {/* Hint Button */}
                  <motion.button
                    whileHover={hintsUsed < 3 ? { scale: 1.03 } : {}}
                    whileTap={hintsUsed < 3 ? { scale: 0.97 } : {}}
                    onClick={handleHint}
                    disabled={hintsUsed >= 3 || hintLoading}
                    style={{
                      padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: hintsUsed >= 3 ? 'not-allowed' : 'pointer',
                      background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', color: hintsUsed >= 3 ? '#4b5563' : '#60a5fa',
                      display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', opacity: hintsUsed >= 3 ? 0.5 : 1,
                    }}>
                    {hintLoading ? (
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #60a5fa', borderTopColor: 'transparent', borderRadius: '50%' }} />
                    ) : '💡'}
                    Hint ({3 - hintsUsed} left)
                  </motion.button>

                  {/* Submit Button */}
                  <motion.button
                    whileHover={!evaluating ? { scale: 1.02 } : {}}
                    whileTap={!evaluating ? { scale: 0.98 } : {}}
                    onClick={handleSubmit}
                    disabled={evaluating}
                    className={`flex-1 py-3 rounded-xl font-bold text-base transition-all duration-200 ${evaluating ? 'cursor-not-allowed text-gray-500' : 'btn-primary'}`}
                    style={evaluating ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' } : {}}>
                    {evaluating ? (
                      <span className="flex items-center justify-center gap-3">
                        <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="inline-block w-4 h-4 border-2 border-[#ff4500] border-t-transparent rounded-full" />
                        Evaluating... 🔍
                      </span>
                    ) : '⚡ Submit Answer'}
                  </motion.button>
                </div>

                <button onClick={() => { setAnswer(''); handleSubmit() }} disabled={evaluating}
                  className="w-full mt-2 py-2 text-sm text-gray-600 hover:text-red-400 transition-colors">Skip (submit empty)</button>
              </motion.div>
            )}

            {/* Evaluation Result */}
            {evalResult && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22,1,0.36,1] }} className="space-y-4">

                {/* Score Card */}
                <div className="card relative overflow-hidden" style={{ background: 'rgba(10,10,10,0.95)', border: `1px solid ${scoreColor(evalResult.score)}30` }}>
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${scoreColor(evalResult.score)}, transparent)` }} />
                  <div className="flex items-center gap-5">
                    <CircularScore score={evalResult.score} size={90} />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Your Score</div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-black" style={{ color: scoreColor(evalResult.score) }}>{evalResult.score}/10</span>
                        <span className="text-base">{label?.icon}</span>
                        <span className="font-bold text-sm" style={{ color: scoreColor(evalResult.score) }}>{label?.text}</span>
                      </div>
                      {evalResult.is_bluffing && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bluff-alert"
                          style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171' }}>🚨 BLUFF DETECTED</motion.span>
                      )}
                    </div>
                  </div>
                  {/* Hints penalty note */}
                  {hintsUsed > 0 && (
                    <div style={{ marginTop: '10px', fontSize: '11px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      💡 Used {hintsUsed} hint{hintsUsed > 1 ? 's' : ''}
                    </div>
                  )}
                  <div className="mt-4 score-bar">
                    <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${evalResult.score * 10}%` }}
                      transition={{ duration: 1.2, ease: [0.25,1,0.5,1], delay: 0.3 }}
                      style={{
                        background: evalResult.score >= 8 ? 'linear-gradient(90deg, #166534, #4ade80)' : evalResult.score >= 5 ? 'linear-gradient(90deg, #92400e, #fbbf24)' : 'linear-gradient(90deg, #7f1d1d, #f87171)',
                        boxShadow: `0 0 10px ${scoreColor(evalResult.score)}50`,
                      }} />
                  </div>
                </div>

                {/* Mini Roast */}
                <div className="glass-orange rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #ff4500, #ff8c00, transparent)' }} />
                  <div className="text-xs text-[#ff4500] font-bold uppercase tracking-widest mb-3">🔥 Roast</div>
                  <p className="text-[#ff8c00] font-mono text-sm leading-relaxed">"{evalResult.mini_roast}"</p>
                </div>

                {/* Feedback */}
                <div className="card">
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">💡 Feedback</div>
                  <p className="text-gray-300 text-sm leading-relaxed">{evalResult.feedback}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                    {evalResult.approach_rating && (
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px',
                        background: evalResult.approach_rating === 'strong' ? 'rgba(74,222,128,0.1)' : evalResult.approach_rating === 'adequate' ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
                        border: `1px solid ${evalResult.approach_rating === 'strong' ? 'rgba(74,222,128,0.3)' : evalResult.approach_rating === 'adequate' ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)'}`,
                        color: evalResult.approach_rating === 'strong' ? '#4ade80' : evalResult.approach_rating === 'adequate' ? '#fbbf24' : '#f87171',
                        textTransform: 'uppercase',
                      }}>Approach: {evalResult.approach_rating}</span>
                    )}
                  </div>
                  {evalResult.key_missing && evalResult.key_missing !== 'null' && (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#fbbf24', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <span>⚠️</span><span><strong>Key miss:</strong> {evalResult.key_missing}</span>
                    </div>
                  )}
                </div>

                {/* Follow-up Section */}
                {!showFollowup && !followupEval && (
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleFollowup}
                    disabled={followupLoading}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                      background: 'rgba(147,51,234,0.08)', border: '1px solid rgba(147,51,234,0.3)', color: '#a78bfa',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s',
                    }}>
                    {followupLoading ? (
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #a78bfa', borderTopColor: 'transparent', borderRadius: '50%' }} />
                    ) : '🔄'} Deep Dive — Get a Follow-up Question
                  </motion.button>
                )}

                {/* Follow-up Question + Answer */}
                {showFollowup && followup && !followupEval && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <div className="card relative overflow-hidden" style={{ border: '1px solid rgba(147,51,234,0.25)', background: 'rgba(147,51,234,0.04)' }}>
                      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #9333ea, #a78bfa, transparent)' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'rgba(147,51,234,0.15)', border: '1px solid rgba(147,51,234,0.3)', color: '#a78bfa', textTransform: 'uppercase' }}>
                          {followup.followup_type?.replace('_', ' ') || 'Follow-up'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>Deep Dive</span>
                      </div>
                      <p className="text-white font-semibold leading-relaxed">{followup.followup_question}</p>
                    </div>
                    <textarea value={followupAnswer} onChange={e => setFollowupAnswer(e.target.value)}
                      placeholder="Answer the follow-up..." rows={4}
                      className="w-full rounded-xl p-4 text-white placeholder-gray-600 font-mono text-sm resize-none focus:outline-none"
                      style={{ background: 'rgba(8,8,8,0.95)', border: '1px solid rgba(147,51,234,0.2)' }} />
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={handleFollowupSubmit}
                      disabled={followupLoading || !followupAnswer.trim()}
                      className="w-full py-3 rounded-xl font-bold"
                      style={{ background: followupAnswer.trim() ? 'rgba(147,51,234,0.2)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(147,51,234,0.3)', color: followupAnswer.trim() ? '#a78bfa' : '#4b5563', cursor: followupAnswer.trim() ? 'pointer' : 'not-allowed' }}>
                      {followupLoading ? 'Evaluating...' : '⚡ Submit Follow-up'}
                    </motion.button>
                  </motion.div>
                )}

                {/* Follow-up Evaluation */}
                {followupEval && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="card" style={{ border: '1px solid rgba(147,51,234,0.2)', background: 'rgba(147,51,234,0.03)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase' }}>🔄 Follow-up Result</span>
                        <span className="text-lg font-black" style={{ color: scoreColor(followupEval.score) }}>{followupEval.score}/10</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#c4b5fd', fontFamily: 'monospace', marginBottom: '8px' }}>"{followupEval.mini_roast}"</p>
                      <p style={{ fontSize: '13px', color: '#9ca3af' }}>{followupEval.feedback}</p>
                      {followup?.why && (
                        <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px', fontStyle: 'italic' }}>💬 Why this was asked: {followup.why}</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Collapsible answer */}
                {answer && (
                  <details className="card cursor-pointer group">
                    <summary className="text-xs text-gray-500 font-bold uppercase tracking-widest list-none flex items-center justify-between">
                      <span>Your Answer</span><span className="group-open:rotate-180 transition-transform">▾</span>
                    </summary>
                    <p className="mt-4 text-gray-400 text-sm font-mono leading-relaxed whitespace-pre-wrap border-t border-white/5 pt-4">{answer}</p>
                  </details>
                )}

                {/* Next Button */}
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleNext} className="w-full btn-primary py-4 text-base font-black">
                  {isLast ? '🏁 See Final Results' : `→ Next Question (${currentIndex + 2}/${questions.length})`}
                </motion.button>
              </motion.div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
