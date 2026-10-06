/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
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
          danger: 'rgb(var(--lc-danger) / <alpha-value>)',
          success: 'rgb(var(--lc-success) / <alpha-value>)',
        },
      },
      borderRadius: {
        card: '1rem',
        btn: '0.75rem',
      },
      boxShadow: {
        press: '0 2px 0 0 rgb(0 0 0 / 0.15)',
        'press-down': '0 0px 0 0 rgb(0 0 0 / 0.15)',
      },
    },
  },
  plugins: [],
}
