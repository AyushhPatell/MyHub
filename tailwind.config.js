/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Unified primary: indigo to match app gradients (nav, buttons, links)
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'page-title': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700' }],
        'section-title': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'card-title': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionDuration: {
        '250': '250ms',
      },
      boxShadow: {
        'focus': '0 0 0 3px rgba(99, 102, 241, 0.4)',
        'focus-dark': '0 0 0 3px rgba(129, 140, 248, 0.35)',
      },
    },
  },
  plugins: [],
}

