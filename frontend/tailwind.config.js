/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'rgb(219 234 254)',
          500: 'rgb(37 99 235)',
          600: 'rgb(37 99 235)',
          700: 'rgb(29 78 216)',
        },
        gray: {
          50: 'rgb(249 250 251)',
          100: 'rgb(243 244 246)',
          200: 'rgb(229 231 235)',
          300: 'rgb(209 213 219)',
          400: 'rgb(156 163 175)',
          500: 'rgb(107 114 128)',
          600: 'rgb(75 85 99)',
          700: 'rgb(55 65 81)',
          800: 'rgb(31 41 55)',
          900: 'rgb(17 24 39)',
        },
        success: {
          500: 'rgb(5 150 105)',
          600: 'rgb(5 150 105)',
        },
        warning: {
          500: 'rgb(217 119 6)',
          600: 'rgb(217 119 6)',
        },
        error: {
          500: 'rgb(220 38 38)',
          600: 'rgb(220 38 38)',
        }
      },
      spacing: {
        '18': '4.5rem',
      },
      borderRadius: {
        'xl': '0.75rem',
      }
    },
  },
  plugins: [],
}