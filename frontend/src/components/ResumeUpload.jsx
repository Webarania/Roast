import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { uploadResume } from '../api/client'

const TIPS = [
  'Use a real tech resume with actual skills listed',
  'The more skills you claim, the more we have to roast',
  'Lying about years of experience? We will find out.',
]

const PROGRESS_MESSAGES = [
  { text: 'Parsing your resume...', icon: '📄' },
  { text: 'Extracting your lies...', icon: '🔍' },
  { text: 'Preparing the roast...', icon: '🔥' },
  { text: 'Almost done cooking...', icon: '🍳' },
]

const INTENSITIES = [
  { id: 'mild',   label: 'Mild',   emoji: '😊', desc: 'Gentle teasing', color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.3)' },
  { id: 'medium', label: 'Medium', emoji: '😏', desc: 'Sarcastic & funny', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.3)' },
  { id: 'savage', label: 'Savage', emoji: '💀', desc: 'No mercy', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.3)' },
]

export default function ResumeUpload({ onComplete, intensity = 'medium', onIntensityChange }) {
  const [dragging, setDragging]   = useState(false)
  const [file, setFile]           = useState(null)
  const [mobile, setMobile]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [progressStep, setProgressStep] = useState(0)
  const [progressPct, setProgressPct]   = useState(0)
  const [shake, setShake]         = useState(false)
  const fileRef = useRef()

  const handleFile = (f) => {
    setError('')
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      triggerError('Only PDF files are supported.')
      return
    }
    if (f.size > 2 * 1024 * 1024) {
      triggerError('File must be under 2MB.')
      return
    }
    setFile(f)
  }

  const triggerError = (msg) => {
    setError(msg)
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleSubmit = async () => {
    if (!file) return
    if (!mobile || mobile.length < 10) {
      triggerError('Please enter a valid mobile number to track your score.')
      return
    }
    setLoading(true)
    setError('')
    setProgressStep(0)
    setProgressPct(5)

    try {
      const t1 = setTimeout(() => { setProgressStep(1); setProgressPct(35) }, 1400)
      const t2 = setTimeout(() => { setProgressStep(2); setProgressPct(65) }, 3000)
      const t3 = setTimeout(() => { setProgressStep(3); setProgressPct(85) }, 4500)

      const data = await uploadResume(file, mobile)
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      setProgressPct(100)
      setTimeout(() => onComplete(data), 300)
    } catch (err) {
      triggerError(err.message || 'Upload failed. Please try again.')
      setLoading(false)
      setProgressPct(0)
    }
  }

  const currentMsg = PROGRESS_MESSAGES[progressStep] || PROGRESS_MESSAGES[0]

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 relative">
      {/* Particles bg */}
      <div className="particles-container" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="particle" />)}
      </div>

      {/* Back */}
      <div className="w-full max-w-lg mb-6 relative z-10">
        <motion.button
          whileHover={{ x: -3 }}
          onClick={() => onComplete(null)}
          className="text-gray-500 hover:text-white text-sm flex items-center gap-2 transition-colors font-medium"
        >
          <span>←</span> Back
        </motion.button>
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22,1,0.36,1] }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
            className="text-5xl mb-4"
          >🔥</motion.div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-2">
            Upload Your <span className="fire-gradient">Resume</span>
          </h2>
          <p className="text-gray-400 text-sm">We'll analyze it, then roast everything wrong with it</p>
        </div>

        {/* Drop Zone */}
        <AnimatePresence mode="wait">
          {!loading && (
            <>
              {/* Mobile Number Input */}
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                className="mb-4"
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  📱 Enter Mobile Number (To track your score)
                </div>
                <input 
                  type="tel" 
                  value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, '').substring(0, 15))}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-[#ff4500]/50 transition-all font-mono"
                />
              </motion.div>

              <motion.div
                key="dropzone"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className={`relative cursor-pointer rounded-2xl p-10 text-center transition-all duration-300
                ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}
                ${dragging ? 'glow-border' : ''}
                ${file && !error ? 'glow-border-green' : ''}
                ${error ? 'glow-border-red' : ''}`}
              style={{
                background: dragging
                  ? 'rgba(255,69,0,0.06)'
                  : file && !error
                    ? 'rgba(74,222,128,0.04)'
                    : error
                      ? 'rgba(248,113,113,0.04)'
                      : 'rgba(255,255,255,0.02)',
                border: '1px dashed',
                borderColor: dragging
                  ? '#ff4500'
                  : file && !error
                    ? 'rgba(74,222,128,0.5)'
                    : error
                      ? 'rgba(248,113,113,0.5)'
                      : 'rgba(255,255,255,0.12)',
              }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />

              <AnimatePresence mode="wait">
                {file && !error ? (
                  <motion.div
                    key="file-preview"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                      className="w-16 h-16 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center mx-auto mb-4"
                    >
                      <span className="text-3xl">✅</span>
                    </motion.div>
                    <div className="text-white font-bold text-lg mb-1">{file.name}</div>
                    <div className="text-sm text-gray-400 mb-4">
                      {(file.size / 1024).toFixed(0)} KB · PDF
                    </div>
                    <button
                      className="text-xs text-gray-600 hover:text-red-400 transition-colors px-3 py-1 rounded-full border border-white/10 hover:border-red-400/30"
                      onClick={(e) => { e.stopPropagation(); setFile(null); setError('') }}
                    >
                      Remove file
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      animate={dragging ? { scale: 1.2, rotate: 10 } : { scale: 1, rotate: 0 }}
                      className="text-5xl mb-4"
                    >📄</motion.div>
                    <div className="text-white font-bold text-lg mb-1">
                      {dragging ? '🔥 Drop it — we dare you' : 'Drop your resume here'}
                    </div>
                    <div className="text-sm text-gray-500 mb-3">or click to browse</div>
                    <div className="text-xs text-gray-600">PDF only · Max 2MB · Tech resumes only</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-3 rounded-xl overflow-hidden"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)' }}
            >
              <p className="text-red-400 text-sm font-medium">⚠️ {error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-0"
            >
              <div className="card text-center py-8" style={{ background: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,69,0,0.2)' }}>
                {/* Animated icon */}
                <motion.div
                  animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-4xl mb-5"
                >
                  {currentMsg.icon}
                </motion.div>

                {/* Status text */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={progressStep}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="text-[#ff6b35] font-mono text-sm font-semibold mb-6 cursor-blink"
                  >
                    {currentMsg.text}
                  </motion.div>
                </AnimatePresence>

                {/* Progress bar */}
                <div className="w-full max-w-xs mx-auto">
                  <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div
                      className="h-full progress-bar-glow"
                      initial={{ width: '5%' }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  {/* Steps */}
                  <div className="flex justify-between">
                    {PROGRESS_MESSAGES.map((msg, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          scale: i === progressStep ? 1.2 : 1,
                          opacity: i <= progressStep ? 1 : 0.3,
                        }}
                        className="text-lg"
                      >
                        {i < progressStep ? '✅' : msg.icon}
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-gray-600 mt-5">This takes 5–10 seconds</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Intensity Selector */}
        {!loading && file && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5"
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', textAlign: 'center' }}>
              🔥 Roast Intensity
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {INTENSITIES.map(i => (
                <motion.button
                  key={i.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onIntensityChange?.(i.id)}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '12px',
                    background: intensity === i.id ? i.bg : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${intensity === i.id ? i.border : 'rgba(255,255,255,0.06)'}`,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    boxShadow: intensity === i.id ? `0 0 20px ${i.bg}` : 'none',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{i.emoji}</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: intensity === i.id ? i.color : '#9ca3af' }}>{i.label}</div>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{i.desc}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Submit */}
        <AnimatePresence>
          {!loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.button
                whileHover={file ? { scale: 1.02 } : {}}
                whileTap={file ? { scale: 0.98 } : {}}
                onClick={handleSubmit}
                disabled={!file}
                className={`w-full mt-5 py-4 rounded-xl font-black text-lg transition-all duration-300
                  ${file ? 'btn-primary' : 'cursor-not-allowed text-gray-600 rounded-xl border border-white/5'}`}
                style={!file ? { background: 'rgba(255,255,255,0.03)' } : {}}
              >
                {file ? '🔥 Roast My Resume' : '📄 Select a file first'}
              </motion.button>

              <p className="text-center text-xs text-gray-600 mt-3">
                🔒 Processed in memory only. Never stored or shared.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <div className="text-xs text-gray-600 font-bold uppercase tracking-widest mb-3">Pro tips for better roasting</div>
          <div className="space-y-2">
            {TIPS.map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-start gap-2.5"
              >
                <span className="text-[#ff4500] mt-0.5 text-xs font-bold">▸</span>
                <span className="text-xs text-gray-500">{tip}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
