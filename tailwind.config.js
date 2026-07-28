/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#0B0F19',
          card: '#151C2C',
          border: '#2A364F',
          neonCyan: '#00F0FF',
          neonPurple: '#7000FF',
          neonPink: '#FF007A',
          gold: '#FFD700',
          emerald: '#10B981',
        }
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 240, 255, 0.35)',
        'glow-purple': '0 0 20px rgba(112, 0, 255, 0.35)',
        'glow-gold': '0 0 25px rgba(255, 215, 0, 0.4)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.35)',
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse at top, #1a233d 0%, #0b0f19 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
      animation: {
        shake: 'shake 0.3s ease-in-out',
      },
    },
  },
  // Provides the `animate-in fade-in / zoom-in / slide-in-from-bottom` classes
  // the components were written against
  plugins: [require('tailwindcss-animate')],
}
