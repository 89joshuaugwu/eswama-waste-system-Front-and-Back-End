/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        eswama: {
          green: '#1E7A4C',
          dark: '#14532D',
        },
      },
    },
  },
  plugins: [],
};
