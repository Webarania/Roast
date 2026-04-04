import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getLeaderboard } from '../api/client'
import axios from 'axios'

const SAMPLE_ROASTS = [
  { text: 'Your React skills are like your commit history — empty.', author: 'Dev Roast AI on a "React Expert"' },
  { text: '3 years of Python and you still Google "how to reverse a list". Legend.', author: 'Dev Roast AI on a Junior Dev' },
  { text: 'Docker in your skills? You ran hello-world once and put it on your resume.', author: 'Dev Roast AI on a DevOps Aspirant' },
  { text: "Senior Developer? Your GitHub hasn't seen a push since the pandemic.", author: 'Dev Roast AI on a "10x Engineer"' },
  { text: 'Full Stack Developer — meaning you watched one MERN tutorial on YouTube.', author: 'Dev Roast AI on a Bootcamp Grad' },
]

const BADGE_CONFIG = {
  top_engineer:      { emoji: '🏆', color: '#ffd700' },
  skilled_developer: { emoji: '⭐', color: '#60a5fa' },
  overconfident_dev: { emoji: '😅', color: '#ff8c00' },
  beginner_bluffer:  { emoji: '💀', color: '#f87171' },
}

const FEATURES = [
  { icon: '🧠', title: 'AI Resume Analysis',      desc: 'Parses your PDF and extracts skills, projects, red flags', color: '#ff4500' },
  { icon: '🎤', title: 'Real-World Interview',     desc: 'Scenario-based questions from your actual tech stack', color: '#ff8c00' },
  { icon: '💡', title: 'Live AI Hints',            desc: 'Stuck? Get progressive hints without giving up', color: '#60a5fa' },
  { icon: '🔄', title: 'Deep Dive Follow-ups',     desc: 'AI probes deeper based on how you answered', color: '#a78bfa' },
  { icon: '📊', title: 'Skill Breakdown',          desc: 'See exactly where you\'re strong vs bluffing', color: '#fbbf24' },
  { icon: '🏆', title: 'Global Leaderboard',       desc: 'Compete, share, and challenge your friends', color: '#4ade80' },
]

function useCounter(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let frame = 0
    const totalFrames = Math.round(duration / 16)
    const timer = setInterval(() => {
      frame++
      const eased = 1 - Math.pow(1 - frame / totalFrames, 3)
      setCount(Math.round(eased * target))
      if (frame >= totalFrames) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, start])
  return count
}

/* Fake code lines scrolling animation */
function CodeRain() {
  const lines = [
    { text: 'const skills = resume.parse(pdf);', color: '#ff4500' },
    { text: 'if (skills.includes("Docker")) {', color: '#fbbf24' },
    { text: '  roast("You ran hello-world once");', color: '#f87171' },
    { text: '}', color: '#fbbf24' },
    { text: 'const score = ai.evaluate(answers);', color: '#60a5fa' },
    { text: 'const badge = getBadge(score);', color: '#4ade80' },
    { text: '// bluff_detected: true 🚨', color: '#f87171' },
    { text: 'leaderboard.submit(user, score);', color: '#a78bfa' },
    { text: 'share.generate({ roast, badge });', color: '#ff8c00' },
  ]
  return (
    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '45%', overflow: 'hidden', opacity: 0.07, pointerEvents: 'none', display: 'none' }} className="lg:!block">
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: [0, 0.8, 0.8, 0], x: [40, 0, 0, -20] }}
          transition={{ duration: 6, delay: i * 1.8, repeat: Infinity, repeatDelay: lines.length * 1.8 - 6 }}
          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', color: line.color, whiteSpace: 'nowrap', padding: '6px 0' }}
        >
          {line.text}
        </motion.div>
      ))}
    </div>
  )
}

export default function Landing({ onStart }) {
  const [roastIndex, setRoastIndex] = useState(0)
  const [leaderboard, setLeaderboard] = useState([])
  const [statsVisible, setStatsVisible] = useState(false)
  const statsRef = useRef(null)

  const devsRoasted = useCounter(12847, 2000, statsVisible)
  const shareRate   = useCounter(31,    1600, statsVisible)
  const avgSeconds  = useCounter(45,    1400, statsVisible)

  useEffect(() => {
    const timer = setInterval(() => setRoastIndex(i => (i + 1) % SAMPLE_ROASTS.length), 4000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Wake up Render backend immediately
    axios.get('https://roast-7n43.onrender.com/health').catch(() => {})
    getLeaderboard(5).then(d => setLeaderboard(d.entries || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setStatsVisible(true)
    }, { threshold: 0.3 })
    if (statsRef.current) obs.observe(statsRef.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div style={{ background: '#030303', minHeight: '100vh' }}>
      {/* Fire particles */}
      <div className="particles-container" aria-hidden="true">
        {Array.from({ length: 15 }).map((_, i) => <div key={i} className="particle" />)}
      </div>

      {/* ═══════════════════ NAV ═══════════════════ */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(24px)', background: 'rgba(3,3,3,0.85)', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '14px 24px' }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <motion.span animate={{ rotate: [0, -10, 10, -5, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }} style={{ fontSize: '24px' }}>🔥</motion.span>
            <span style={{ fontWeight: 900, color: '#fff', fontSize: '18px', letterSpacing: '-0.02em' }}>Dev Roast <span className="fire-gradient">AI</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="hidden sm:flex" style={{ fontSize: '11px', color: '#4b5563', fontFamily: 'monospace', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80' }} />
              LIVE
            </span>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onStart}
              style={{ padding: '8px 20px', borderRadius: '10px', background: 'linear-gradient(135deg, #ff4500, #ff6b35)', color: '#fff', fontWeight: 800, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
              Get Started
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ═══════════════════ HERO BANNER ═══════════════════ */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '80px 24px 60px' }}>
        {/* Bg glow */}
        <div style={{ position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '800px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,69,0,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <CodeRain />

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Tagline pill */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '50px', background: 'rgba(255,69,0,0.06)', border: '1px solid rgba(255,69,0,0.2)', marginBottom: '32px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4500', animation: 'blink 2s ease-in-out infinite' }} />
              <span style={{ fontSize: '12px', color: '#ff6b35', fontWeight: 700, letterSpacing: '0.04em' }}>AI-POWERED SKILL EXPOSURE ENGINE</span>
            </motion.div>

            {/* Main Headline — split layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px', alignItems: 'center' }} className="lg:!grid-cols-[1.2fr_1fr]">
              {/* Left: Text */}
              <div>
                <h1 style={{ margin: 0, lineHeight: 1 }}>
                  <motion.span initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}
                    style={{ display: 'block', fontSize: 'clamp(3rem, 7vw, 5.5rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
                    Think you're
                  </motion.span>
                  <motion.span initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
                    style={{ display: 'block', fontSize: 'clamp(3rem, 7vw, 5.5rem)', fontWeight: 900, letterSpacing: '-0.03em' }}
                    className="fire-gradient">
                    a real developer?
                  </motion.span>
                  <motion.span initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
                    style={{ display: 'block', fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', fontWeight: 900, color: '#6b7280', letterSpacing: '-0.02em', marginTop: '8px' }}>
                    Prove it. 🔥
                  </motion.span>
                </h1>

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  style={{ fontSize: '17px', color: '#9ca3af', lineHeight: 1.7, marginTop: '28px', maxWidth: '520px' }}>
                  Upload your resume. Our AI builds a <span style={{ color: '#ff6b35', fontWeight: 600 }}>custom interview</span> from your
                  actual skills. Real-world scenarios. Live hints. Follow-up deep dives.
                  Then we <span style={{ color: '#f87171', fontWeight: 600 }}>roast everything you got wrong</span>.
                </motion.p>

                {/* CTA buttons */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '36px', alignItems: 'center' }}>
                  <div className="pulse-ring" style={{ borderRadius: '14px' }}>
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onStart}
                      style={{ padding: '16px 36px', borderRadius: '14px', background: 'linear-gradient(135deg, #ff4500, #ff6b35)', color: '#fff', fontWeight: 900, fontSize: '18px', border: 'none', cursor: 'pointer', letterSpacing: '-0.01em' }}>
                      🎯 Test Your Skills
                    </motion.button>
                  </div>
                  <span style={{ fontSize: '12px', color: '#4b5563' }}>Free · No signup · 60 seconds</span>
                </motion.div>

                {/* Trust badges */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                  style={{ display: 'flex', gap: '24px', marginTop: '32px' }}>
                  {[
                    { value: '12,847+', label: 'Devs Roasted' },
                    { value: '31%', label: 'Share Rate' },
                    { value: '<60s', label: 'Full Session' },
                  ].map(({ value, label }) => (
                    <div key={label} style={{ textAlign: 'left' }}>
                      <div className="fire-gradient" style={{ fontSize: '20px', fontWeight: 900 }}>{value}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>{label}</div>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right: Roast Terminal Card */}
              <motion.div initial={{ opacity: 0, x: 40, rotate: 1 }} animate={{ opacity: 1, x: 0, rotate: 0 }} transition={{ delay: 0.4, duration: 0.7 }}>
                <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,69,0,0.15)', boxShadow: '0 0 80px rgba(255,69,0,0.08), 0 30px 60px rgba(0,0,0,0.5)', background: 'rgba(8,8,8,0.95)' }}>
                  {/* Terminal chrome */}
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#4b5563', fontFamily: 'monospace' }}>dev-roast-ai v1.0</span>
                  </div>

                  <div style={{ padding: '20px' }}>
                    {/* Command */}
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#4ade80', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#ff4500' }}>$</span>
                      <span style={{ color: '#6b7280' }}>npx</span>
                      <span>dev-roast</span>
                      <span style={{ color: '#fbbf24' }}>--analyze</span>
                      <span style={{ color: '#f87171' }}>--no-mercy</span>
                      <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.8, repeat: Infinity }} style={{ color: '#ff4500' }}>█</motion.span>
                    </div>

                    {/* Output label */}
                    <div style={{ fontSize: '10px', color: '#374151', fontFamily: 'monospace', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>OUTPUT</div>

                    {/* Rotating roast */}
                    <div style={{ minHeight: '90px' }}>
                      <AnimatePresence mode="wait">
                        <motion.div key={roastIndex}
                          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                          transition={{ duration: 0.4 }}>
                          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', color: '#ff6b35', lineHeight: 1.7, margin: '0 0 8px 0' }}>
                            "{SAMPLE_ROASTS[roastIndex].text}"
                          </p>
                          <p style={{ fontSize: '11px', color: '#374151', fontStyle: 'italic', margin: 0 }}>
                            — {SAMPLE_ROASTS[roastIndex].author}
                          </p>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Progress indicator */}
                    <div style={{ display: 'flex', gap: '4px', marginTop: '16px' }}>
                      {SAMPLE_ROASTS.map((_, i) => (
                        <motion.div key={i}
                          animate={{ background: i === roastIndex ? '#ff4500' : 'rgba(255,255,255,0.06)' }}
                          style={{ height: 3, borderRadius: 2, flex: i === roastIndex ? 4 : 1, transition: 'flex 0.4s ease' }} />
                      ))}
                    </div>
                  </div>

                  {/* Bottom bar */}
                  <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#374151', fontFamily: 'monospace' }}>groq/llama-3.3-70b</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#4ade80', fontFamily: 'monospace' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
                      READY
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ FEATURES GRID ═══════════════════ */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#ff4500', textTransform: 'uppercase', letterSpacing: '0.15em' }}>NOT YOUR AVERAGE QUIZ</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900, color: '#fff', marginTop: '12px', letterSpacing: '-0.02em' }}>
              Real interview. Real AI. <span className="fire-gradient">Real roasts.</span>
            </h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {FEATURES.map((feat, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4, borderColor: `${feat.color}40` }}
                style={{
                  padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.3s ease', cursor: 'default',
                }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{feat.icon}</div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>{feat.title}</h3>
                <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6, margin: 0 }}>{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.15em' }}>4 STEPS TO EXPOSURE</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900, color: '#fff', marginTop: '12px' }}>
              How it works
            </h2>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { num: '01', icon: '📄', title: 'Upload Your Resume', desc: 'Drop your PDF. Our AI extracts your skills, job title, projects, and experience in seconds.', accent: '#ff4500' },
              { num: '02', icon: '🔥', title: 'Get Your Initial Roast', desc: 'AI analyzes your resume and delivers a brutal-but-funny verdict on your claimed skills.', accent: '#ff8c00' },
              { num: '03', icon: '🎤', title: 'Survive the AI Interview', desc: 'Real-world scenarios built from YOUR stack. Debug problems, design systems, handle production incidents.', accent: '#fbbf24' },
              { num: '04', icon: '🏆', title: 'Score, Badge & Share', desc: 'Get your final score (0-100), earn a badge, hit the leaderboard, and challenge your friends.', accent: '#4ade80' },
            ].map((step, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', padding: '28px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                {/* Number */}
                <div style={{
                  width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${step.accent}10`, border: `1px solid ${step.accent}30`, flexShrink: 0, fontSize: '20px',
                }}>{step.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: step.accent, fontFamily: 'monospace' }}>{step.num}</span>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', margin: 0 }}>{step.title}</h3>
                  </div>
                  <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ WEBARANIA TEASER ═══════════════════ */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)', width: '80%', margin: '0 auto' }} />
      <section style={{ padding: '100px 24px', background: 'rgba(255,69,0,0.01)', position: 'relative', overflow: 'hidden' }}>
        {/* Background ambient glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,69,0,0.03) 0%, transparent 70%)', pointerEvents: 'none', z_index: 0 }} />
        
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#ff6b35', textTransform: 'uppercase', letterSpacing: '0.2em', padding: '4px 12px', borderRadius: '4px', background: 'rgba(255,69,0,0.1)', border: '1px solid rgba(255,69,0,0.2)' }}>
              WEBARANIA PRESENTS · COMING SOON
            </span>
            
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#fff', marginTop: '32px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              We're Building Something That Gets You Into <span className="fire-gradient">FAANG</span>. But It's Locked. 🔒
            </h2>
            
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#6b7280', marginTop: '16px' }}>
              Dev Roast is just the warm-up.
            </p>
            
            <p style={{ fontSize: '16px', color: '#9ca3af', lineHeight: 1.7, marginTop: '24px', maxWidth: '640px', margin: '24px auto 0' }}>
              We're at 23,000 on Instagram. When we hit 50,000 — we drop <strong>Roasted Resume</strong>.
              <br /><br />
              An AI that doesn't just review your resume. It rebuilds it — to FAANG acceptance standards. Role-specific. ATS-optimized. Brutally honest. The kind of feedback that used to cost ₹10,000 from a senior engineer.
              <br /><br />
              <span style={{ color: '#fff', fontWeight: 700 }}>Free. For our community. At 50K.</span>
            </p>

            {/* Progress Area */}
            <div style={{ marginTop: '48px', maxWidth: '500px', margin: '48px auto 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>🔥 23,000 / 50,000 followers</span>
                <span style={{ fontSize: '12px', color: '#ff6b35', fontWeight: 800 }}>46% TO UNLOCK</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                <motion.div 
                  initial={{ width: 0 }} 
                  whileInView={{ width: '46%' }} 
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #ff4500, #ff8c00, #ffd700)', boxShadow: '0 0 15px rgba(255,69,0,0.5)' }} 
                />
              </div>
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#4b5563', fontSize: '12px' }}>
                <span>⚙️ Feature locked. Community unlocks this.</span>
              </div>
            </div>

            {/* CTA Button */}
            <motion.div style={{ marginTop: '40px' }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <a 
                href="https://www.instagram.com/webarania.wand/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '16px 32px', borderRadius: '14px', 
                  background: '#fff', color: '#000', fontWeight: 900, fontSize: '16px', textDecoration: 'none',
                  boxShadow: '0 0 30px rgba(255,255,255,0.1)'
                }}
              >
                → Follow @webarania.wand and unlock this
              </a>
              <p style={{ fontSize: '11px', color: '#4b5563', marginTop: '16px' }}>
                Every follow brings this closer. Tell one developer friend. That's it.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>
      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)', width: '80%', margin: '0 auto' }} />

      {/* ═══════════════════ STATS ═══════════════════ */}
      <section ref={statsRef} style={{ padding: '60px 24px', borderTop: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', textAlign: 'center' }}>
          {[
            { value: devsRoasted.toLocaleString(), label: 'Developers Roasted', suffix: '+' },
            { value: shareRate, label: 'Share Rate', suffix: '%' },
            { value: avgSeconds, label: 'Avg Session', suffix: 's' },
          ].map(({ value, label, suffix }) => (
            <div key={label}>
              <div className="fire-gradient" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{value}{suffix}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════ LEADERBOARD ═══════════════════ */}
      {leaderboard.length > 0 && (
        <section style={{ padding: '60px 24px' }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.15em' }}>🏆 TOP ENGINEERS THIS WEEK</span>
            </div>
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,8,8,0.8)' }}>
              {leaderboard.map((entry, i) => {
                const cfg = BADGE_CONFIG[entry.badge] || BADGE_CONFIG.beginner_bluffer
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 900, fontSize: '14px', width: '24px', textAlign: 'center',
                        color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#4b5563',
                        textShadow: i < 3 ? '0 0 8px currentColor' : 'none',
                      }}>#{entry.rank}</span>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', color: '#fff',
                        background: `hsl(${(entry.display_name?.charCodeAt(0) || 0) * 15}, 50%, 30%)` }}>
                        {(entry.display_name || '?')[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{entry.display_name}</div>
                        <div style={{ fontSize: '10px', color: cfg.color }}>{cfg.emoji} {entry.badge_title}</div>
                      </div>
                    </div>
                    <span className="fire-gradient" style={{ fontSize: '18px', fontWeight: 900 }}>{entry.score}</span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════ BOTTOM CTA ═══════════════════ */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: '#fff', marginBottom: '12px' }}>
            Ready to find out the <span className="fire-gradient">truth</span>?
          </h2>
          <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '32px' }}>
            Most developers can't score above 60. Think you're different?
          </p>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onStart}
            style={{ padding: '18px 48px', borderRadius: '14px', background: 'linear-gradient(135deg, #ff4500, #ff6b35)', color: '#fff', fontWeight: 900, fontSize: '20px', border: 'none', cursor: 'pointer', boxShadow: '0 0 40px rgba(255,69,0,0.3)' }}>
            🔥 Get Roasted Now
          </motion.button>
          <div style={{ fontSize: '12px', color: '#374151', marginTop: '16px' }}>No signup · Resume not stored · Completely free</div>
        </motion.div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '20px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: '#374151' }}>
          <span>Dev Roast AI</span>
          <span>·</span>
          <span>Built for devs, by devs</span>
          <span>·</span>
          <span>Powered by Groq + Llama 3.3</span>
          <span>·</span>
          <span className="fire-gradient" style={{ fontWeight: 700 }}>🔥 Free forever</span>
        </div>
      </footer>
    </div>
  )
}
