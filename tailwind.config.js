
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Hanken Grotesk Variable"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: 'var(--eh-brand)',
          hover: 'var(--eh-brand-hover)',
          soft: 'var(--eh-brand-soft)',
        },
        accent: {
          DEFAULT: 'var(--eh-accent)',
          hover: 'var(--eh-accent-hover)',
          soft: 'var(--eh-accent-soft)',
        },
        surface: {
          DEFAULT: 'var(--eh-surface)',
          2: 'var(--eh-surface-2)',
          page: 'var(--eh-page)',
        },
        ink: {
          DEFAULT: 'var(--eh-text)',
          soft: 'var(--eh-text-soft)',
          muted: 'var(--eh-text-muted)',
        },
        line: 'var(--eh-border)',
      },
      boxShadow: {
        'eh-sm': 'var(--eh-shadow-sm)',
        'eh-lg': 'var(--eh-shadow-lg)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.75rem',
      },
    },
  },
  plugins: [],
}
