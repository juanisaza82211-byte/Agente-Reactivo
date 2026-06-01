/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        leaf: '#2f7d4f',
        moss: '#596c2f',
        soil: '#6b4f3f',
        skyglass: '#dff4f1'
      }
    }
  },
  plugins: []
}
