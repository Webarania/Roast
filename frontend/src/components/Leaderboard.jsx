import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getLeaderboard } from '../api/client'

const BADGE_CONFIG = {
  top_engineer:      { emoji: '🏆', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
  skilled_developer: { emoji: '⭐', color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20' },
  overconfident_dev: { emoji: '😅', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' },
  beginner_bluffer:  { emoji: '💀', color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20' },
}

const PODIUM_META = {
  1: { label: '🥇', height: 'h-28 sm:h-36', cls: 'podium-1', nameColor: 'text-yellow-400', glow: 'rgba(255,215,0,0.3)', order: 'order-2' },
  2: { label: '🥈', height: 'h-20 sm:h-28', cls: 'podium-2', nameColor: 'text-gray-300',   glow: 'rgba(192,192,192,0.2)', order: 'order-1' },
  3: { label: '🥉', height: 'h-16 sm:h-24', cls: 'podium-3', nameColor: 'text-orange-400', glow: 'rgba(205,127,50,0.2)', order: 'order-3' },
}

/* Avatar circle with deterministic color from name */
function Avatar({ name, size = 36 }) {
  const hue = ((name || '?').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) * 37) % 360
  return (
    <div
      className="avatar-circle text-white font-black flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `hsl(${hue}, 55%, 30%)`,
        border: `1px solid hsl(${hue}, 55%, 45%)`,
        fontSize: size * 0.38,
      }}
    >
      {(name || '?')[0].toUpperCase()}
    </div>
  )
}

/* Score color helper */
const scoreColor = (s) =>
  s >= 80 ? '#ffd700' : s >= 60 ? '#60a5fa' : s >= 40 ? '#ff8c00' : '#f87171'

export default function Leaderboard({ onBack, userSessionId }) {
  const [entries, setEntries] = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    getLeaderboard(20)
      .then(data => {
        setEntries(data.entries || [])
        setTotal(data.total || 0)
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const top3 = entries.slice(0, 3)
  const rest  = entries.slice(3)

  return (
    <div className="min-h-screen px-4 py-8 fire-bg relative">
      <div className="particles-container opacity-20" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="particle" />)}
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
              <span>🏆</span>
              <span>Leaderboard</span>
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {total.toLocaleString()} developer{total !== 1 ? 's' : ''} roasted
            </p>
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

        {/* ── Loading ── */}
        {loading && (
          <div className="text-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-[#ff4500] border-t-transparent rounded-full mx-auto mb-4"
            />
            <div className="text-gray-500 text-sm">Loading rankings...</div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card text-center"
          >
            <div className="text-5xl mb-3">😵</div>
            <div className="text-red-400">{error}</div>
          </motion.div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && entries.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="card text-center py-20"
          >
            <motion.div
              animate={{ y: [0, -12, 0], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              className="text-6xl mb-5"
            >
              🚀
            </motion.div>
            <div className="text-white font-bold text-lg mb-2">No one on the leaderboard yet.</div>
            <div className="text-gray-500 text-sm">Be the first to claim your rank!</div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={onBack}
              className="btn-primary mt-6 px-8 py-3 text-sm font-bold"
            >
              🎯 Get Roasted First
            </motion.button>
          </motion.div>
        )}

        {entries.length > 0 && (
          <>
            {/* ── Podium ── */}
            {top3.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }}
                className="flex items-end justify-center gap-3 mb-8"
              >
                {[
                  { rank: 2, entry: top3[1] },
                  { rank: 1, entry: top3[0] },
                  { rank: 3, entry: top3[2] },
                ].map(({ rank, entry }, i) => {
                  if (!entry) return null
                  const meta = PODIUM_META[rank]
                  const cfg  = BADGE_CONFIG[entry.badge] || BADGE_CONFIG.beginner_bluffer
                  const isUser = entry.session_id === userSessionId

                  return (
                    <motion.div
                      key={rank}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.12, duration: 0.5, ease: [0.22,1,0.36,1] }}
                      className={`flex-1 max-w-[160px] ${meta.order}`}
                    >
                      {/* Name + badge above bar */}
                      <div className="text-center mb-2">
                        {isUser && (
                          <div className="text-xs font-bold text-[#ff4500] mb-1">YOU</div>
                        )}
                        <Avatar name={entry.display_name} size={40} />
                        <div className={`text-xs font-bold truncate mt-1.5 ${meta.nameColor}`}>
                          {entry.display_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 font-bold tabular-nums"
                          style={{ color: scoreColor(entry.score) }}>
                          {entry.score}
                        </div>
                      </div>

                      {/* Podium bar */}
                      <div
                        className={`w-full ${meta.height} ${meta.cls} rounded-t-xl flex items-end justify-center pb-3 relative`}
                        style={{ boxShadow: `0 -4px 20px ${meta.glow}` }}
                      >
                        <div className="text-center">
                          <div className="text-2xl">{meta.label}</div>
                          <div className="text-xs text-gray-400 font-mono">#{rank}</div>
                        </div>
                        {isUser && (
                          <div
                            className="absolute inset-0 rounded-t-xl opacity-30"
                            style={{ background: 'linear-gradient(to top, rgba(255,69,0,0.4), transparent)' }}
                          />
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}

            {/* ── Full Ranked List ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="card overflow-hidden p-0"
              style={{ background: 'rgba(8,8,8,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {entries.map((entry, i) => {
                const cfg    = BADGE_CONFIG[entry.badge] || BADGE_CONFIG.beginner_bluffer
                const isUser = entry.session_id === userSessionId
                const medals = ['🥇','🥈','🥉']

                return (
                  <motion.div
                    key={entry.rank}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.04, duration: 0.4 }}
                    className={`flex items-center gap-3 px-5 py-3.5 border-b border-white/5 last:border-0 transition-all duration-200
                      ${isUser ? 'bg-[#ff4500]/6' : 'hover:bg-white/[0.02]'}`}
                    style={isUser ? { boxShadow: 'inset 0 0 30px rgba(255,69,0,0.05)' } : {}}
                  >
                    {/* Rank */}
                    <div className="w-8 text-center flex-shrink-0">
                      {entry.rank <= 3 ? (
                        <span className="text-lg">{medals[entry.rank - 1]}</span>
                      ) : (
                        <span className="text-sm font-bold text-gray-600">#{entry.rank}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar name={entry.display_name} size={34} />

                    {/* Name + badge */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold truncate ${isUser ? 'text-[#ff6b35]' : 'text-white'}`}>
                          {entry.display_name}
                        </span>
                        {isUser && (
                          <span
                            className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(255,69,0,0.15)', color: '#ff6b35' }}
                          >
                            you
                          </span>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border mt-0.5 inline-block ${cfg.bg} ${cfg.color}`}>
                        {cfg.emoji} {entry.badge_title}
                      </span>
                    </div>

                    {/* Score */}
                    <div
                      className="text-xl font-black flex-shrink-0 tabular-nums"
                      style={{
                        color: scoreColor(entry.score),
                        textShadow: isUser ? `0 0 10px ${scoreColor(entry.score)}` : 'none',
                      }}
                    >
                      {entry.score}
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </>
        )}

        {/* ── Challenge CTA ── */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-6 card text-center relative overflow-hidden"
            style={{ background: 'rgba(255,69,0,0.04)', border: '1px solid rgba(255,69,0,0.2)' }}
          >
            <div className="absolute inset-0 opacity-5"
              style={{ background: 'radial-gradient(ellipse at center, #ff4500, transparent 70%)' }} />
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="text-3xl mb-2"
            >🎯</motion.div>
            <div className="text-white font-black text-lg mb-1 relative z-10">Think you can rank higher?</div>
            <div className="text-gray-500 text-sm mb-4 relative z-10">Challenge your friends — share your score</div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={onBack}
              className="btn-primary text-sm px-8 py-2.5 font-bold relative z-10"
            >
              🔄 Go Again
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
