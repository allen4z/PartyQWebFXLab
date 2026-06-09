/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#3b82f6',
          indigo: '#6366f1',
          purple: '#a855f7',
          violet: '#8b5cf6',
          orange: '#f97316',
          amber: '#fbbf24',
        },
        ink: {
          900: '#070710',
          800: '#0b0b18',
          700: '#11111f',
          600: '#181830',
          500: '#23233f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px -4px rgba(99,102,241,0.55)',
        'glow-orange': '0 0 24px -4px rgba(249,115,22,0.6)',
        'glow-purple': '0 0 30px -6px rgba(168,85,247,0.6)',
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 45%, #f97316 100%)',
        'panel-gradient':
          'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
