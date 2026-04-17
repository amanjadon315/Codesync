/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        editor: {
          bg: '#0d1117',
          sidebar: '#161b22',
          panel: '#1c2128',
          border: '#30363d',
          text: '#e6edf3',
          muted: '#8b949e',
        },
      },
    },
  },
  plugins: [],
};
