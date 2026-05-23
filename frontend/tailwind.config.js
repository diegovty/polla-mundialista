/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        wc: {
          green: '#1a7a4a',
          'green-dark': '#145c38',
          gold: '#f4a503',
          'gold-dark': '#d48a00',
        },
      },
    },
  },
  plugins: [],
};
