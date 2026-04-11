import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { getInitialRoast, startInterview } from '../api/client'

function useTypewriter(text, speed = 22) {
  const [displayed, setDisplayed] = useState('')
  const indexRef = useRef(0)
  useEffect(() => {
    if (!text) return
    setDisplayed('')
    indexRef.current = 0
    const timer = setInterval(() => {
      indexRef.current++
      setDisplayed(text.slice(0, indexRef.current))
      if (indexRef.current >= text.length) clearInterval(timer)
    }, speed)
    return () => clearInterval(timer)
  }, [text])
  return displayed
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay },
})

export default function InitialRoast({ sessionId, resumeData, intensity = 'medium', onStartInterview, onReset }) {
  const [roast,    setRoast]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    getInitialRoast(sessionId, intensity)
      .then(data => { setRoast(data); setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }, [sessionId])

  const roastText = useTypewriter(roast?.roast || '')

  const handleStartInterview = async () => {
    setStarting(true)
    try {
      const data = await startInterview(sessionId, 5, intensity)
      onStartInterview(data.questions)
    } catch (err) {
      setError(err.message)
      setStarting(false)
    }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050505' }}>
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-7xl mb-6"
          >🔥</motion.div>
          <div className="text-[#ff4500] font-mono text-lg font-bold cursor-blink mb-2">
            Analyzing your resume...
          </div>
          <div className="text-gray-500 text-sm">Preparing the roast of your life</div>
          <div className="mt-6 w-48 mx-auto h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #ff4500, #ff8c00)' }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>
    )
  }

  /* ── Error ── */
  if (error && !roast) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#050505' }}>
        <div className="card max-w-md text-center">
          <div className="text-5xl mb-4">😵</div>
          <div className="text-red-400 mb-4">{error}</div>
          <button onClick={() => window.location.reload()} className="btn-secondary">Try Again</button>
        </div>
      </div>
    )
  }

  /* ── Main ── */
  return (
    <div style={{ background: '#050505', minHeight: '100vh', padding: '48px 16px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        {/* Back to Home */}
        <motion.div {...fadeUp(0)} style={{ marginBottom: '24px' }}>
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

        {/* Header */}
        <motion.div {...fadeUp(0.05)} style={{ textAlign: 'center', marginBottom: '32px' }}>
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 8, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            style={{ fontSize: '56px', marginBottom: '16px' }}
          >🔥</motion.div>
          <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>
            The Verdict on{' '}
            <span className="fire-gradient">{resumeData?.name || 'Your'}</span>'s Resume
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>No sugarcoating. No mercy. Just facts.</p>
        </motion.div>

        {/* Terminal Roast */}
        <motion.div {...fadeUp(0.1)} style={{ marginBottom: '20px' }}>
          <div className="terminal-card" style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 0 40px rgba(255,69,0,0.15)' }}>
            <div style={{ height: '2px', background: 'linear-gradient(90deg, #ff4500, #ff8c00, #ffd700)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <span style={{ fontSize: '11px', color: '#4b5563', marginLeft: '8px', fontFamily: 'monospace' }}>dev_roast_ai.exe — verdict.log</span>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: '11px', color: '#4b5563', fontFamily: 'monospace', marginBottom: '16px' }}>
                &gt; analyzing {resumeData?.name || 'candidate'}... done<br/>
                &gt; running brutal-mode honesty protocol...
              </div>
              <blockquote style={{
                fontSize: '15px', color: '#ff8c00', fontFamily: 'monospace',
                lineHeight: 1.7, borderLeft: '2px solid #ff4500', paddingLeft: '16px', margin: 0
              }}>
                "{roastText}"
                {roastText.length < (roast?.roast?.length || 0) && (
                  <span style={{ color: '#ff4500', marginLeft: '2px', animation: 'blink 1s step-end infinite' }}>█</span>
                )}
              </blockquote>
              {roast?.roast && roastText.length >= roast.roast.length && (
                <div style={{ marginTop: '12px', fontSize: '11px', color: '#22c55e', fontFamily: 'monospace' }}>
                  &gt; verdict complete. <span style={{ color: '#4b5563' }}>exit code: 0</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Skills Grid */}
        {(roast?.strong_skills?.length > 0 || roast?.weak_skills?.length > 0) && (
          <motion.div {...fadeUp(0.2)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            {roast?.strong_skills?.length > 0 && (
              <div className="card" style={{ border: '1px solid rgba(74,222,128,0.2)', background: 'rgba(74,222,128,0.03)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                  ✅ Might Actually Know
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {roast.strong_skills.map(s => (
                    <span key={s} className="chip-strong">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {roast?.weak_skills?.length > 0 && (
              <div className="card" style={{ border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.03)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                  ❌ Suspicious Skills
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {roast.weak_skills.map(s => (
                    <span key={s} className="chip-weak">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Red Flags */}
        {roast?.red_flags?.length > 0 && (
          <motion.div {...fadeUp(0.22)} style={{ marginBottom: '20px' }}>
            <div className="card" style={{ border: '1px solid rgba(248,113,113,0.15)', background: 'rgba(248,113,113,0.03)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                🚩 Resume Red Flags
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {roast.red_flags.map((flag, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#fca5a5' }}>
                    <span style={{ color: '#f87171', flexShrink: 0, marginTop: '2px' }}>▸</span>
                    <span>{flag}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Resume Stats */}
        <motion.div {...fadeUp(0.25)} style={{ marginBottom: '20px' }}>
          <div className="card">
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
              📊 What We Found in Your Resume
            </div>
            {/* Job title + domain */}
            {(resumeData?.job_title || resumeData?.domain) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', justifyContent: 'center' }}>
                {resumeData?.job_title && (
                  <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '8px', background: 'rgba(255,69,0,0.08)', border: '1px solid rgba(255,69,0,0.25)', color: '#ff6b35' }}>
                    {resumeData.job_title}
                  </span>
                )}
                {resumeData?.domain && (
                  <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '8px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa' }}>
                    {resumeData.domain}
                  </span>
                )}
                {resumeData?.years_of_experience > 0 && (
                  <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '8px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>
                    {resumeData.years_of_experience}+ years
                  </span>
                )}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
              {[
                { value: resumeData?.skills?.length ?? 0,     label: 'Skills Listed' },
                { value: resumeData?.projects?.length ?? 0,   label: 'Projects' },
                { value: resumeData?.experience_level ?? '?', label: 'Level', capitalize: true },
              ].map(({ value, label, capitalize }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px 8px' }}>
                  <div className="fire-gradient" style={{ fontSize: '24px', fontWeight: 900, marginBottom: '4px', textTransform: capitalize ? 'capitalize' : 'none' }}>
                    {value}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div {...fadeUp(0.3)} style={{ textAlign: 'center', paddingBottom: '32px' }}>
          {error && <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '20px' }}>
            Think you can back it up?{' '}
            <span className="fire-gradient-subtle" style={{ fontWeight: 600 }}>Prove it in the interview 👇</span>
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleStartInterview}
            disabled={starting}
            className="btn-primary"
            style={{ fontSize: '18px', padding: '14px 48px', fontWeight: 900, width: '100%', maxWidth: '320px' }}
          >
            {starting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }}
                />
                Generating Questions...
              </span>
            ) : '🎤 Start Interview'}
          </motion.button>
          <p style={{ fontSize: '11px', color: '#4b5563', marginTop: '10px' }}>10 questions (MCQ + Scenario) · ~5 min · No retakes</p>
        </motion.div>

      </div>
    </div>
  )
}
