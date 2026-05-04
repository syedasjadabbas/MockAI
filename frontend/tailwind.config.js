/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        'dashboard-dark': '#090b14',
        'card-dark': 'rgba(15, 20, 35, 0.7)',
        'accent-glow': 'rgba(99, 102, 241, 0.15)',
      },
    },
  },
  plugins: [],
}
