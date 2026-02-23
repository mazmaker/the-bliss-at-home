/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans Thai', 'Noto Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      // Shared design system values
      colors: {
        // Primary colors (Brown/Amber for spa theme)
        primary: {
          50: '#faf8f5',
          100: '#f5eddb',
          200: '#e7d6b0',
          300: '#d9bc83',
          400: '#cc9f5a',
          500: '#bf8134',
          600: '#a2692a',
          700: '#7f5122',
          800: '#5d3b1b',
          900: '#3f2814',
        },
        // Secondary colors
        secondary: {
          50: '#f5f3f0',
          100: '#e8e4de',
          200: '#d1c7bd',
          300: '#b8a799',
          400: '#9f8877',
          500: '#846d59',
          600: '#685446',
          700: '#4d3d35',
          800: '#342925',
          900: '#1f1917',
        },
      },
    },
  },
}