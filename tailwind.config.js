/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Montserrat', 'sans-serif'] },
      colors: {
        brand: '#BDD630',
        'brand-hover': '#c8e235',
        'brand-dim': 'rgba(189,214,48,0.07)',
        'brand-border': 'rgba(189,214,48,0.2)',
        dark: {
          bg: '#080808',
          s1: '#0e0e0e',
          s2: '#131313',
          s3: '#181818',
          border: '#232323',
          t1: '#efefef',
          t2: '#777777',
          t3: '#3a3a3a',
        },
        status: {
          designing: '#4f8ef7',
          developing: '#f0a030',
          reviewing: '#a78bfa',
          live: '#BDD630',
        },
      },
    },
  },
  plugins: [],
}
