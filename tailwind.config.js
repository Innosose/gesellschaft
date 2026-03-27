/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        win: {
          bg:            '#1c1c1c',
          surface:       '#252525',
          surface2:      '#2c2c2c',
          surface3:      '#333333',
          border:        'rgba(255,255,255,0.07)',
          borderFocus:   'rgba(255,255,255,0.15)',
          accent:        '#0078d4',
          accent2:       '#1a86d8',
          accentDim:     'rgba(0,120,212,0.18)',
          accentGlow:    'rgba(0,120,212,0.45)',
          text:          '#f3f3f3',
          textSub:       '#ababab',
          textMuted:     '#5c5c5c',
          danger:        '#c42b1c',
          success:       '#6ccb5f',
          warning:       '#fce100',
        }
      },
      fontFamily: {
        sans: ['Segoe UI Variable', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif']
      },
      borderRadius: {
        'win':    '8px',
        'win-lg': '12px',
        'win-xl': '16px',
      },
      animation: {
        'fade-in':     'fadeIn 0.2s ease both',
        'fade-in-up':  'fadeInUp 0.25s ease both',
        'scale-in':    'scaleIn 0.22s cubic-bezier(0.16,1,0.3,1) both',
        'shimmer':     'shimmer 3s linear infinite',
        'pulse-glow':  'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        fadeInUp:  { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        scaleIn:   { from: { opacity: 0, transform: 'scale(0.97) translateY(4px)' }, to: { opacity: 1, transform: 'scale(1) translateY(0)' } },
        shimmer:   { '0%': { backgroundPosition: '-200% center' }, '100%': { backgroundPosition: '200% center' } },
        pulseGlow: { '0%, 100%': { boxShadow: '0 0 0 0 rgba(0,120,212,0.45)' }, '50%': { boxShadow: '0 0 12px 3px rgba(0,120,212,0.45)' } },
      },
      boxShadow: {
        'win':     '0 2px 8px rgba(0,0,0,0.25)',
        'win-lg':  '0 8px 32px rgba(0,0,0,0.6)',
        'accent':  '0 0 0 1px rgba(0,120,212,0.2), 0 6px 20px rgba(0,0,0,0.4)',
      }
    }
  },
  plugins: []
}
