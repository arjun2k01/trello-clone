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
          DEFAULT: '#0079bf',
          hover: '#026aa7',
          light: '#5ba4cf',
        },
        success: '#61bd4f',
        warning: '#f2d600',
        danger: '#eb5a46',
        dark: '#172b4d',
        light: '#fafbfc',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}