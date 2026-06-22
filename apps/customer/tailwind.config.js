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
          50:  '#f6f3f0',
          100: '#f2ede9',
          200: '#e3dbd4',
          300: '#d0c4b8',
          400: '#bfb5a1',
          500: '#a09484',
          600: '#837858',
          700: '#775642',
          800: '#4a3728',
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
