/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        espresso: '#12100e',
        walnut: '#1a1714',
        latte: '#24201c',
        borderClay: '#302a25',
        ochre: {
          DEFAULT: '#c89d66',
          soft: '#dfc096',
          deep: '#967142',
        },
        terracotta: '#c96a52',
        sage: '#7d9b76',
        parchment: '#e6dfd5',
        sand: '#a69d91'
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
