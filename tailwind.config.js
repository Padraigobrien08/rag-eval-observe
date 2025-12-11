/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        card: '0.5rem', // rounded-lg
        'card-lg': '0.75rem', // rounded-xl
      },
      colors: {
        border: {
          subtle: 'rgba(229, 231, 235, 0.7)', // border-gray-200/70
        },
        surface: {
          subtle: '#f8fafc', // bg-slate-50
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.05)', // shadow-sm
      },
    },
  },
  plugins: [],
}
