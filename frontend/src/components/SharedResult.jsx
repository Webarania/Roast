import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getSharedResult } from '../api/client'

const BADGE_CONFIG = {
  top_engineer: {
    emoji: '🏆', color: 'text-yellow-400',
    bg: 'from-yellow-900/40 to-yellow-800/10',
    border: 'border-yellow-500/40',
    glow: '0 0 50px rgba(255,215,0,0.2)',
  },
  skilled_developer: {
    emoji: '⭐', color: 'text-blue-400',
    bg: 'from-blue-900/40 to-blue-800/10',
    border: 'border-blue-500/40',
    glow: '0 0 50px rgba(96,165,250,0.18)',
  },
  overconfident_dev: {
    emoji: '😅', color: 'text-orange-400',
    bg: 'from-orange-900/40 to-orange-800/10',
    border: 'border-orange-500/40',
    glow: '0 0 50px rgba(255,140,0,0.18)',
  },
  beginner_bluffer: {
    emoji: '💀', color: 'text-red-400',
    bg: 'from-red-900/40 to-red-800/10',
    border: 'border-red-500/40',
    glow: '0 0 50px rgba(248,113,113,0.18)',
  },
}

/* Score color */
const scoreColor = (s) =>
  s >= 80 ? '#ffd700' : s >= 60 ? '#60a5fa' : s >= 40 ? '#ff8c00' : '#f87171'

export default function SharedResult() {
  const { shareId } = useParams()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    getSharedResult(shareId)
      .then(d => { setData(d); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [shareId])

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center fire-bg">
        <div className="particles-container" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="particle" />)}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center relative z-10"
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-6xl mb-5"
          >🔥</motion.div>
          <div className="text-[#ff4500] font-mono font-bold cursor-blink">Loading roast result...</div>
        </motion.div>
      </div>
    )
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 fire-bg">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="card max-w-md text-center"
        >
          <div className="text-5xl mb-3">🔗</div>
          <div className="text-red-400 mb-2 font-semibold">This roast link has expired or doesn't exist.</div>
          <div className="text-gray-500 text-sm mb-6">{error}</div>
          <a href="/" className="btn-primary text-sm px-8 py-3 font-bold inline-flex items-center gap-2">
            🎯 Get Roasted Too
          </a>
        </motion.div>
      </div>
    )
  }

  const cfg = BADGE_CONFIG[data.badge] || BADGE_CONFIG.beginner_bluffer

  const containerVariants = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.12 } },
  }
  const itemVariants = {
    hidden:  { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22,1,0.36,1] } },
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 fire-bg relative">
      {/* Particles */}
      <div className="particles-container" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => <div key={i} className="particle" />)}
      </div>

      {/* Nav bar */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-20 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <span className="font-black text-white">Dev Roast <span className="fire-gradient">AI</span></span>
        </div>
        <a
          href="/"
          className="btn-primary text-xs px-4 py-2 font-bold"
        >
          🎯 Try It
        </a>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-lg space-y-5 relative z-10 mt-16"
      >
        {/* ── Viral Header ── */}
        <motion.div variants={itemVariants} className="text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5 text-xs font-semibold"
            style={{ background: 'rgba(255,69,0,0.1)', border: '1px solid rgba(255,69,0,0.25)', color: '#ff6b35' }}
          >
            🔥 Dev Roast AI — Shared Result
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
            <span className="fire-gradient">{data.display_name}</span>
            <span className="text-white"> got roasted</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            And the AI had no mercy whatsoever 💀
          </p>
        </motion.div>

        {/* ── Score + Badge ── */}
        <motion.div
          variants={itemVariants}
          className={`badge-shimmer card text-center bg-gradient-to-br ${cfg.bg} border ${cfg.border} relative overflow-hidden`}
          style={{ boxShadow: cfg.glow }}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />

          <motion.div
            animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            className="text-6xl mb-4"
          >
            {cfg.emoji}
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.4 }}
            className="text-7xl font-black tabular-nums mb-1"
            style={{ color: scoreColor(data.score) }}
          >
            {data.score}
            <span className="text-3xl text-gray-600 font-light">/100</span>
          </motion.div>

          <div className={`text-xl font-black mt-1 ${cfg.color}`}>{data.badge_title}</div>

          {/* Score bar */}
          <div className="mt-4 score-bar max-w-xs mx-auto">
            <motion.div
              className="score-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${data.score}%` }}
              transition={{ duration: 1.5, ease: [0.25,1,0.5,1], delay: 0.6 }}
              style={{
                background: `linear-gradient(90deg, ${scoreColor(data.score)}66, ${scoreColor(data.score)})`,
                boxShadow: `0 0 10px ${scoreColor(data.score)}50`,
              }}
            />
          </div>
        </motion.div>

        {/* ── Roast Quote ── */}
        <motion.div
          variants={itemVariants}
          className="glass-orange rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5"
            style={{ background: 'linear-gradient(90deg, #ff4500, #ff8c00, #ffd700)' }} />
          <div className="text-xs text-[#ff4500] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>🔥</span> Their Roast
          </div>
          <blockquote className="text-[#ff8c00] font-mono text-sm leading-relaxed">
            "{data.final_roast}"
          </blockquote>
        </motion.div>

        {/* ── Fake Skills ── */}
        {data.fake_skills?.length > 0 && (
          <motion.div variants={itemVariants} className="card">
            <div className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>🚨</span> Caught Bluffing
            </div>
            <div className="flex flex-wrap gap-2">
              {data.fake_skills.map((s, i) => (
                <motion.span
                  key={s}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-3 py-1 text-sm rounded-full line-through font-semibold"
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}
                >
                  {s}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Challenge CTA ── */}
        <motion.div
          variants={itemVariants}
          className="card text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,69,0,0.08) 0%, rgba(255,140,0,0.05) 100%)',
            border: '1px solid rgba(255,69,0,0.25)',
          }}
        >
          <div className="absolute inset-0 opacity-10"
            style={{ background: 'radial-gradient(ellipse at 50% 100%, #ff4500, transparent 70%)' }} />

          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="text-4xl mb-3 relative z-10"
          >
            😏
          </motion.div>

          <div className="text-white font-black text-xl mb-1 relative z-10">
            Think you can do better?
          </div>
          <div className="text-gray-500 text-sm mb-6 relative z-10">
            Take the challenge — upload your resume and get roasted by the same AI
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center relative z-10">
            <motion.a
              href="/"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="btn-primary inline-flex items-center justify-center gap-2 px-10 py-4 text-base font-black"
            >
              🎯 Test My Skills
            </motion.a>
          </div>

          {/* Social share row */}
          <div className="flex items-center justify-center gap-3 mt-5 relative z-10">
            <motion.a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I got roasted by Dev Roast AI and scored ${data.score}/100 🔥 Think you can beat me? Try it: ${window.location.origin}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              𝕏 Share on Twitter
            </motion.a>
            <motion.a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              in LinkedIn
            </motion.a>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div variants={itemVariants} className="text-center text-xs text-gray-700 pb-4">
          Dev Roast AI · Resume data not stored · Built for devs 🔥
        </motion.div>
      </motion.div>
    </div>
  )
}
