import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getFixPlan } from '../api/client'

const PRIORITY_META = {
  high:   { color: 'text-red-400',    bg: 'bg-red-400/8 border-red-400/25',    glow: 'rgba(248,113,113,0.15)', dot: '#f87171', label: 'HIGH',   icon: '🔴', bar: 'from-red-900 to-red-500' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-400/8 border-yellow-400/25', glow: 'rgba(251,191,36,0.12)',  dot: '#fbbf24', label: 'MEDIUM', icon: '🟡', bar: 'from-yellow-900 to-yellow-500' },
  low:    { color: 'text-green-400',  bg: 'bg-green-400/8 border-green-400/25',   glow: 'rgba(74,222,128,0.12)',  dot: '#4ade80', label: 'LOW',    icon: '🟢', bar: 'from-green-900 to-green-500' },
}

const TIMELINE_ICONS = {
  '1 week':   '⚡',
  '2 weeks':  '📅',
  '1 month':  '🗓️',
  '2 months': '🏃',
  '3 months': '🎯',
}

function timelineIcon(timeline) {
  for (const [key, icon] of Object.entries(TIMELINE_ICONS)) {
    if (timeline?.toLowerCase().includes(key)) return icon
  }
  return '⏱️'
}

export default function FixPlan({ sessionId, onBack, onRoastAgain }) {
  const [plan,    setPlan]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    getFixPlan(sessionId)
      .then(data => { setPlan(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [sessionId])

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="text-6xl mb-6"
          >🛠️</motion.div>
          <div className="text-[#ff4500] font-mono text-lg font-bold cursor-blink mb-2">
            Building your fix plan...
          </div>
          <div className="text-gray-600 text-sm">Personalized learning roadmap incoming</div>
          <div className="mt-6 w-48 mx-auto h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full progress-bar-glow"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </div>
    )
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card max-w-md text-center"
        >
          <div className="text-5xl mb-4">😵</div>
          <div className="text-red-400 mb-4">{error}</div>
          <button onClick={onBack} className="btn-secondary">← Back</button>
        </motion.div>
      </div>
    )
  }

  const containerVariants = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.1 } },
  }
  const itemVariants = {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22,1,0.36,1] } },
  }

  return (
    <div className="min-h-screen px-4 py-8 fire-bg relative">
      <div className="particles-container opacity-20" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="particle" />)}
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22,1,0.36,1] }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
              <span>🛠️</span>
              <span>Your Fix Plan</span>
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">Personalized learning roadmap based on your performance</p>
          </div>
          <motion.button
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.96 }}
            onClick={onBack}
            className="btn-secondary text-sm px-4 py-2"
          >
            ← Back
          </motion.button>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          {/* ── Priority Skills ── */}
          {plan?.priority_skills?.length > 0 && (
            <motion.div variants={itemVariants} className="card relative overflow-hidden"
              style={{ background: 'rgba(255,69,0,0.04)', border: '1px solid rgba(255,69,0,0.2)' }}>
              <div className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: 'linear-gradient(90deg, #ff4500, #ff8c00, transparent)' }} />
              <div className="text-xs font-bold text-[#ff4500] uppercase tracking-widest mb-4 flex items-center gap-2">
                <span>🎯</span> Focus On These First
              </div>
              <div className="flex flex-wrap gap-2">
                {plan.priority_skills.map((s, i) => (
                  <motion.span
                    key={s}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 300 }}
                    className="chip-fire font-bold"
                  >
                    {s}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Roadmap ── */}
          {plan?.roadmap?.length > 0 && (
            <motion.div variants={itemVariants}>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span>📚</span> Learning Roadmap
              </div>
              <div className="space-y-3">
                {plan.roadmap.map((item, i) => {
                  const meta = PRIORITY_META[item.priority] || PRIORITY_META.medium
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.09, duration: 0.45, ease: [0.22,1,0.36,1] }}
                      whileHover={{ y: -2 }}
                      className="card relative overflow-hidden"
                      style={{
                        border: `1px solid ${meta.dot}20`,
                        boxShadow: `0 0 20px ${meta.glow}`,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {/* Left priority stripe */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-2xl"
                        style={{ background: meta.dot, boxShadow: `0 0 8px ${meta.dot}` }}
                      />

                      <div className="pl-3">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-bold text-base mb-1">{item.skill}</div>
                            <div className="text-gray-400 text-sm leading-relaxed">{item.action}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            {/* Priority badge */}
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full border font-bold flex items-center gap-1 ${meta.bg} ${meta.color}`}
                            >
                              {meta.icon} {meta.label}
                            </span>
                            {/* Timeline */}
                            {item.timeline && (
                              <span className="text-xs text-gray-500 flex items-center gap-1 font-mono">
                                {timelineIcon(item.timeline)} {item.timeline}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Resources */}
                        {item.resources?.length > 0 && (
                          <div>
                            <div className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">Resources</div>
                            <div className="flex flex-wrap gap-1.5">
                              {item.resources.map((r, j) => (
                                <motion.span
                                  key={j}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.2 + j * 0.05 }}
                                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                                  style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#9ca3af',
                                  }}
                                >
                                  {r}
                                </motion.span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ── Resume Tips ── */}
          {plan?.resume_tips?.length > 0 && (
            <motion.div variants={itemVariants} className="card relative overflow-hidden"
              style={{ background: 'rgba(96,165,250,0.03)', border: '1px solid rgba(96,165,250,0.15)' }}>
              <div className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: 'linear-gradient(90deg, #60a5fa, transparent)' }} />
              <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                <span>📝</span> Resume Improvement Tips
              </div>
              <ol className="space-y-3">
                {plan.resume_tips.map((tip, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="flex items-start gap-3"
                  >
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black mt-0.5"
                      style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-gray-300 text-sm leading-relaxed">{tip}</span>
                  </motion.li>
                ))}
              </ol>
            </motion.div>
          )}

          {/* ── Motivational Footer ── */}
          <motion.div
            variants={itemVariants}
            className="card text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,69,0,0.08) 0%, rgba(255,140,0,0.05) 50%, rgba(255,215,0,0.04) 100%)',
              border: '1px solid rgba(255,69,0,0.2)',
            }}
          >
            <div className="absolute inset-0 opacity-10"
              style={{ background: 'radial-gradient(ellipse at 50% 100%, #ff4500, transparent 70%)' }} />

            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
              className="text-5xl mb-4 relative z-10"
            >🚀</motion.div>

            <div className="text-white font-black text-xl mb-2 relative z-10">
              You can <span className="fire-gradient">actually improve.</span>
            </div>
            <div className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto mb-6 relative z-10">
              Focus on the high-priority skills, build real projects, and come back
              in 30 days to see how much you've improved.
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={onRoastAgain}
              className="btn-primary text-sm px-8 py-3 font-bold relative z-10"
            >
              🔄 Roast Me Again
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
