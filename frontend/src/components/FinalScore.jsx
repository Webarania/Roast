import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getFinalRoast, submitToLeaderboard, generateShare } from '../api/client'
import html2canvas from 'html2canvas'

/* ── Confetti ── */
function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left:  `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2.5 + Math.random() * 2}s`,
    color: ['#ff4500','#ff8c00','#ffd700','#ff6b35','#4ade80','#60a5fa','#f472b6'][Math.floor(Math.random() * 7)],
    size: `${8 + Math.random() * 10}px`,
    rotation: `${Math.random() * 360}deg`,
  }))
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDuration: p.duration,
            animationDelay: p.delay,
            transform: `rotate(${p.rotation})`,
          }}
        />
      ))}
    </div>
  )
}

/* ── Animated Score Ring ── */
function ScoreRing({ score, animated }) {
  const r = 70
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(score / 100, 1))
  const dashoffset = circ * (1 - pct)
  const color = score >= 80 ? '#ffd700' : score >= 60 ? '#60a5fa' : score >= 40 ? '#ff8c00' : '#f87171'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#ff4500" />
            <stop offset="50%"  stopColor="#ff8c00" />
            <stop offset="100%" stopColor="#ffd700" />
          </linearGradient>
        </defs>
        <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <motion.circle
          cx="90" cy="90" r={r}
          fill="none"
          stroke={score >= 80 ? 'url(#ringGrad)' : color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={animated ? { strokeDashoffset: dashoffset } : { strokeDashoffset: circ }}
          transition={{ duration: 2, ease: [0.25,1,0.5,1], delay: 0.3 }}
          transform="rotate(-90 90 90)"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Score</div>
        <motion.div
          className="text-5xl font-black tabular-nums"
          style={{ color }}
        >
          {score}
        </motion.div>
        <div className="text-xs text-gray-500">/100</div>
      </div>
    </div>
  )
}

const BADGE_CONFIG = {
  top_engineer: {
    emoji: '🏆', color: 'text-yellow-400',
    bg: 'from-yellow-900/40 to-yellow-800/10',
    border: 'border-yellow-500/40',
    glow: '0 0 40px rgba(255,215,0,0.25), 0 0 80px rgba(255,215,0,0.1)',
    tier: 'gold',
  },
  skilled_developer: {
    emoji: '⭐', color: 'text-blue-400',
    bg: 'from-blue-900/40 to-blue-800/10',
    border: 'border-blue-500/40',
    glow: '0 0 40px rgba(96,165,250,0.2)',
    tier: 'blue',
  },
  overconfident_dev: {
    emoji: '😅', color: 'text-orange-400',
    bg: 'from-orange-900/40 to-orange-800/10',
    border: 'border-orange-500/40',
    glow: '0 0 40px rgba(255,140,0,0.2)',
    tier: 'orange',
  },
  beginner_bluffer: {
    emoji: '💀', color: 'text-red-400',
    bg: 'from-red-900/40 to-red-800/10',
    border: 'border-red-500/40',
    glow: '0 0 40px rgba(248,113,113,0.2)',
    tier: 'red',
  },
}

export default function FinalScore({ sessionId, resumeData, intensity = 'medium', onViewLeaderboard, onFixPlan, onReset }) {
  const scoreCardRef = useRef(null)
  const [result,      setResult]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [animatedScore, setAnimatedScore] = useState(0)
  const [ringActive,  setRingActive]  = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [displayName, setDisplayName] = useState(resumeData?.name || '')
  const [submitting,  setSubmitting]  = useState(false)
  const [submitted,   setSubmitted]   = useState(false)
  const [rank,        setRank]        = useState(null)
  const [shareText,   setShareText]   = useState('')
  const [shareUrl,    setShareUrl]    = useState('')
  const [copied,      setCopied]      = useState(false)

  useEffect(() => {
    getFinalRoast(sessionId, intensity)
      .then(data => {
        setResult(data)
        setLoading(false)

        // Count-up animation
        let current = 0
        const target = data.total_score
        const step = Math.ceil(target / 50)
        const timer = setInterval(() => {
          current = Math.min(current + step, target)
          setAnimatedScore(current)
          if (current >= target) clearInterval(timer)
        }, 35)

        // Ring + confetti
        setTimeout(() => setRingActive(true), 200)
        setTimeout(() => setShowConfetti(true), 500)
        setTimeout(() => setShowConfetti(false), 4500)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [sessionId])

  const handleSubmitLeaderboard = async () => {
    if (!displayName.trim()) return
    setSubmitting(true)
    try {
      const data = await submitToLeaderboard(sessionId, displayName)
      setRank(data.rank)
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleShare = async () => {
    try {
      // 1. Capture the score card as an image
      let imageData = null
      if (scoreCardRef.current) {
        const canvas = await html2canvas(scoreCardRef.current, {
          backgroundColor: '#050505',
          scale: 2, // Higher quality
          logging: false,
          useCORS: true
        })
        imageData = canvas.toDataURL('image/png')
      }

      // 2. Generate the share link from backend (for tracking/DB)
      const data = await generateShare(sessionId, displayName || resumeData?.name || 'Dev')
      setShareText(data.share_text)
      setShareUrl('https://webarania.com/roast/') // Use the custom domain link
      
      // 3. Download the image for the user
      if (imageData) {
        const link = document.createElement('a')
        link.download = `dev-roast-score-${displayName || 'dev'}.png`
        link.href = imageData
        link.click()
        alert("Score card image downloaded! You can now upload this image when you share your link on LinkedIn or Instagram.")
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const copyShare = () => {
    navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareToTwitter  = () => {
    const text = `🔥 I just got roasted by Dev Roast AI!\n\nScore: ${result.total_score}/100\nBadge: ${result.badge_title}\n\n"${result.final_roast.substring(0, 100)}..."\n\nGet exposed here: https://webarania.com/roast`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareToLinkedIn = () => {
    const url = `https://webarania.com/roast`
    // LinkedIn doesn't support pre-filled text well, so we rely on the URL and the downloaded image
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank')
  }

  const shareToInstagram = () => {
    const text = `🔥 Dev Roast AI Score: ${result.total_score}/100\n🏆 Badge: ${result.badge_title}\n\n${result.final_roast}\n\nAnalyze your resume at webarania.com/roast`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    
    alert("🚀 Instagram Format Ready!\n\n1. Your score card image was downloaded.\n2. The viral roast text is copied to your clipboard.\n\nOpening Instagram now... Paste the text into your Story or Bio!")
    window.open(`https://www.instagram.com/`, '_blank')
  }

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
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="text-6xl mb-6"
          >⚖️</motion.div>
          <div className="text-[#ff4500] font-mono text-lg font-bold cursor-blink mb-2">
            Calculating your final verdict...
          </div>
          <div className="text-gray-600 text-sm">No mercy mode engaged</div>
          <div className="mt-6 w-48 mx-auto h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full progress-bar-glow"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </div>
    )
  }

  if (error && !result) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card max-w-md text-center"
        >
          <div className="text-5xl mb-4">😵</div>
          <div className="text-red-400 mb-4">{error}</div>
        </motion.div>
      </div>
    )
  }

  const cfg = BADGE_CONFIG[result?.badge] || BADGE_CONFIG.beginner_bluffer

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  }
  const itemVariants = {
    hidden:  { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22,1,0.36,1] } },
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 fire-bg relative overflow-y-auto">
      {showConfetti && <Confetti />}

      <div className="particles-container opacity-40" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => <div key={i} className="particle" />)}
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

      <motion.div
        ref={scoreCardRef}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-2xl space-y-5 relative z-10"
      >
        {/* ── Score Header ── */}
        <motion.div variants={itemVariants} className="text-center py-4">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ScoreRing score={animatedScore} animated={ringActive} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-4 text-sm text-gray-500"
          >
            {result?.total_score >= 80 ? '🔥 Legitimately impressive' :
             result?.total_score >= 60 ? '👍 Not bad, not great' :
             result?.total_score >= 40 ? '😬 Room for improvement' :
             '💀 Better luck next time'}
          </motion.div>
        </motion.div>

        {/* ── Badge Card ── */}
        <motion.div
          variants={itemVariants}
          className={`badge-shimmer card text-center bg-gradient-to-br ${cfg.bg} border ${cfg.border} relative overflow-hidden`}
          style={{ boxShadow: cfg.glow }}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-60" />
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            className="text-6xl mb-3"
          >
            {cfg.emoji}
          </motion.div>
          <div className={`text-2xl font-black mb-1 ${cfg.color}`}>{result?.badge_title}</div>
          <div className="text-gray-500 text-sm">Your Developer Badge</div>
        </motion.div>

        {/* ── Final Roast ── */}
        <motion.div
          variants={itemVariants}
          className="fire-border relative"
        >
          <div className="glass-orange rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5"
              style={{ background: 'linear-gradient(90deg, #ff4500, #ff8c00, #ffd700)' }} />
            <div className="text-xs text-[#ff4500] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <span>🔥</span> Final Roast
            </div>
            <blockquote className="text-[#ff8c00] font-mono text-base leading-relaxed">
              "{result?.final_roast}"
            </blockquote>
          </div>
        </motion.div>

        {/* ── Fake Skills ── */}
        {result?.fake_skills?.length > 0 && (
          <motion.div variants={itemVariants} className="card">
            <div className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span>🚨</span> Skills You Were Caught Bluffing
            </div>
            <div className="flex flex-wrap gap-2">
              {result.fake_skills.map((s, i) => (
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

        {/* ── Breakdown ── */}
        {result?.breakdown && (
          <motion.div variants={itemVariants} className="card">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5 flex items-center gap-2">
              <span>📊</span> Performance Breakdown
            </div>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { value: result.breakdown.total_questions, label: 'Questions',    color: 'fire-gradient' },
                { value: `${result.breakdown.avg_per_question}/10`, label: 'Avg Score', color: 'fire-gradient' },
                {
                  value: result.breakdown.bluff_count,
                  label: 'Bluffs Caught',
                  color: result.breakdown.bluff_count > 0 ? 'text-red-400' : 'text-green-400',
                },
              ].map(({ value, label, color }) => (
                <div key={label} className="text-center py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className={`text-xl font-black mb-1 ${color === 'fire-gradient' ? 'fire-gradient' : color}`}>
                    {value}
                  </div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              ))}
            </div>

            {/* Per-skill bars */}
            <div className="space-y-3">
              {Object.entries(result.breakdown.per_skill_scores || {}).map(([skill, score], i) => (
                <div key={skill} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-28 flex-shrink-0 truncate font-mono">{skill}</span>
                  <div className="flex-1 score-bar">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${score * 10}%` }}
                      transition={{ duration: 1, ease: [0.25,1,0.5,1], delay: 0.1 * i }}
                      style={{
                        background: score >= 8
                          ? 'linear-gradient(90deg, #166534, #4ade80)'
                          : score >= 5
                            ? 'linear-gradient(90deg, #92400e, #fbbf24)'
                            : 'linear-gradient(90deg, #7f1d1d, #f87171)',
                        boxShadow: `0 0 6px ${score >= 8 ? 'rgba(74,222,128,0.3)' : score >= 5 ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)'}`,
                      }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-10 text-right ${
                    score >= 8 ? 'text-green-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {score}/10
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Leaderboard Submission ── */}
        <motion.div variants={itemVariants}>
          {!submitted ? (
            <div className="card">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span>🏆</span> Submit to Leaderboard
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value.slice(0, 30))}
                  placeholder="Your display name"
                  className="flex-1 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(8,8,8,0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(255,69,0,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <motion.button
                  whileHover={!submitting && displayName.trim() ? { scale: 1.04 } : {}}
                  whileTap={!submitting && displayName.trim() ? { scale: 0.97 } : {}}
                  onClick={handleSubmitLeaderboard}
                  disabled={submitting || !displayName.trim()}
                  className={`btn-primary px-5 py-3 text-sm font-bold whitespace-nowrap ${
                    submitting || !displayName.trim() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {submitting ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : 'Submit'}
                </motion.button>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="card text-center"
              style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.25)' }}
            >
              <div className="text-3xl mb-2">🎉</div>
              <div className="text-green-400 font-black text-lg">You're on the leaderboard!</div>
              <div className="text-gray-400 text-sm mt-1">
                You ranked <span className="text-white font-black">#{rank}</span> globally
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ── Share ── */}
        <motion.div variants={itemVariants}>
          {!shareText ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleShare}
              className="w-full btn-secondary py-3.5 flex items-center justify-center gap-2 font-semibold"
            >
              🔗 Generate Share Link
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span>📣</span> Share Your Roast
              </div>
              <div
                className="rounded-xl p-4 text-xs text-gray-400 font-mono whitespace-pre-wrap leading-relaxed mb-4"
                style={{ background: 'rgba(5,5,5,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {shareText}
              </div>
              <div className="flex gap-2 flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={copyShare}
                  className="btn-secondary text-sm px-4 py-2.5 flex-1 flex items-center justify-center gap-2"
                >
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={shareToTwitter}
                  className="btn-secondary text-sm px-4 py-2.5 flex-1 flex items-center justify-center gap-2"
                >
                  𝕏 Twitter/X
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={shareToLinkedIn}
                  className="btn-secondary text-sm px-4 py-2.5 flex-1 flex items-center justify-center gap-2"
                >
                  in LinkedIn
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={shareToInstagram}
                  className="btn-secondary text-sm px-4 py-2.5 flex-1 flex items-center justify-center gap-2"
                >
                  📸 Instagram
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ── Action Buttons ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 pb-8">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onViewLeaderboard}
            className="btn-secondary py-3.5 text-sm flex items-center justify-center gap-2 font-semibold"
          >
            🏆 Leaderboard
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onFixPlan}
            className="btn-primary py-3.5 text-sm flex items-center justify-center gap-2 font-bold"
          >
            🛠️ Fix My Skills
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onReset}
            className="btn-secondary py-3.5 text-sm flex items-center justify-center gap-2 font-semibold"
          >
            🔄 Try Again
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  )
}
