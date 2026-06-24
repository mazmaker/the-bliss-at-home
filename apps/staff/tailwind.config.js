/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans Thai', 'Noto Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        bliss: {
          50:  '#fbfaf6',
          100: '#fbfaf6',
          200: '#ebe6d0',
          300: '#dfd9b9',
          400: '#c8c29c',
          500: '#7a875f',
          600: '#565b34',
          700: '#464a28',
          800: '#363921',
          900: '#1a1a1a',
        },
      },
    },
  },
  safelist: [
    { pattern: /bg-bliss-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /text-bliss-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /border-bliss-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /hover:bg-bliss-(50|100|200|300|400|500|600|700|800|900)/ },
  ],
  plugins: [],
}
