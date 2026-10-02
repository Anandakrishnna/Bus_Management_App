import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#0866ff',
        navy: '#13264a',
        line: '#e5e7eb',
        mist: '#f4f8ff',
      },
      boxShadow: {
        float: '0 8px 24px rgba(19, 38, 74, 0.10)',
      },
    },
  },
  plugins: [],
} satisfies Config
