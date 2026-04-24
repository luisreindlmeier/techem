/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#E30613',
          hover:   '#c00510',
          dark:    '#E2001A',
        },
      },
      keyframes: {
        'mcp-fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'mcp-stage-fade': {
          '0%':   { opacity: '0', transform: 'translateY(3px)' },
          '15%':  { opacity: '1', transform: 'translateY(0)' },
          '85%':  { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-3px)' },
        },
      },
      animation: {
        'mcp-fade-in':    'mcp-fade-in 280ms ease-out',
        'mcp-stage-fade': 'mcp-stage-fade 1600ms ease-in-out',
      },
    },
  },
  plugins: [],
}
