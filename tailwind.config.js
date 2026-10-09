/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fredoka', 'system-ui', 'sans-serif'],
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        hand: ['Caveat', 'Fredoka', 'cursive'],
      },
      colors: {
        lc: {
          bg: 'rgb(var(--lc-bg) / <alpha-value>)',
          surface: 'rgb(var(--lc-surface) / <alpha-value>)',
          card: 'rgb(var(--lc-card) / <alpha-value>)',
          border: 'rgb(var(--lc-border) / <alpha-value>)',
          text: 'rgb(var(--lc-text) / <alpha-value>)',
          muted: 'rgb(var(--lc-muted) / <alpha-value>)',
          accent: 'rgb(var(--lc-accent) / <alpha-value>)',
          'accent-text': 'rgb(var(--lc-accent-text) / <alpha-value>)',
          'accent-ink': 'rgb(var(--lc-accent-ink) / <alpha-value>)',
          olive: 'rgb(var(--lc-olive) / <alpha-value>)',
          pink: 'rgb(var(--lc-pink) / <alpha-value>)',
          mint: 'rgb(var(--lc-mint) / <alpha-value>)',
          sky: 'rgb(var(--lc-sky) / <alpha-value>)',
          lilac: 'rgb(var(--lc-lilac) / <alpha-value>)',
          peach: 'rgb(var(--lc-peach) / <alpha-value>)',
          danger: 'rgb(var(--lc-danger) / <alpha-value>)',
          success: 'rgb(var(--lc-success) / <alpha-value>)',
        },
      },
      borderRadius: {
        card: '1.25rem',
        btn: '0.9rem',
        blob: '1.75rem',
      },
      boxShadow: {
        press: '0 3px 0 0 rgb(var(--lc-accent-ink) / 0.25)',
        'press-down': '0 0px 0 0 rgb(var(--lc-accent-ink) / 0.25)',
        soft: '0 8px 24px -10px rgb(0 0 0 / 0.18)',
        card: '0 2px 10px -4px rgb(0 0 0 / 0.08), 0 1px 0 0 rgb(255 255 255 / 0.6) inset',
        lift: '0 14px 30px -12px rgb(var(--lc-accent-ink) / 0.28)',
      },
      keyframes: {
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.92) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both',
        wiggle: 'wiggle 0.6s ease-in-out',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
}
