/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        roast: {
          bg: '#0a0a0a',
          card: '#111111',
          border: '#1f1f1f',
          orange: '#ff4500',
          amber: '#ff8c00',
          yellow: '#ffd700',
          red: '#ff2020',
          glow: '#ff4500',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'fire': 'fire 1.5s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px #ff4500, 0 0 20px #ff4500' },
          '50%': { boxShadow: '0 0 20px #ff4500, 0 0 40px #ff4500, 0 0 60px #ff4500' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fire: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(1.1)' },
        },
      },
    },
  },
  plugins: [],
}
