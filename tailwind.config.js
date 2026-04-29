/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0d1117',
        surface: '#161b22',
        border: '#1f3529',
        primary: '#10b981',
        highlight: '#34d399',
        textPrimary: '#ecfdf5',
        textMuted: '#6b9e85',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
