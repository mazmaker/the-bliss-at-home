/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Anantason', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
