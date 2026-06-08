// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        ar: ['Cairo', 'Tajawal', 'sans-serif'],
      },
      colors: {
        surface: '#0d1520',
        card: '#1a2840',
        gold: '#f5a623',
        'gold-dim': '#c4831a',
        success: '#00c48c',
        danger: '#ff4d6a',
        info: '#4a9eff',
      },
    },
  },
  plugins: [],
};
