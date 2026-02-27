import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0c1019',
        slate: '#141a2c',
        cyan: '#23c7d9',
        mint: '#6ef2c8',
        amber: '#ffb142',
        rose: '#ff6b81'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(35,199,217,0.3), 0 14px 35px rgba(0,0,0,0.35)'
      }
    }
  },
  plugins: []
};

export default config;

