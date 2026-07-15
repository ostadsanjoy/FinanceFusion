/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F9F8F6',
        surface: '#EFE9E3',
        muted: '#D9CFC7',
        accent: '#C9B59C',
        ink: '#2A2A2A',
      },
      fontFamily: {
        sans: [
          '-apple-system', 
          'BlinkMacSystemFont', 
          '"SF Pro Text"',
          '"Inter"', 
          'sans-serif'
        ],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(201, 181, 156, 0.15)',
        'glass': '0 8px 32px 0 rgba(201, 181, 156, 0.10)',
      }
    },
  },
  plugins: [],
}