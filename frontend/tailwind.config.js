/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'sky-bg':       '#0a1408',
        'sky-card':     '#111f0f',
        'sky-elevated': '#1a2e1a',
        'sky-primary':  '#e8824a',
        'sky-primary-dark': '#c4682e',
        'sky-text':     '#f5f0e8',
        'sky-muted':    '#a89880',
        'sky-success':  '#4ade80',
      },
      fontFamily: {
        display: ["'Playfair Display'", 'serif'],
        body:    ["'Inter'", 'sans-serif'],
      },
      borderRadius: {
        card:  '20px',
        input: '12px',
      },
    }
  },
  plugins: [],
}
