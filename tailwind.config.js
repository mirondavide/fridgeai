/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: 'rgba(255,255,255,0.03)',
        border: 'rgba(255,255,255,0.08)',
      },
      backgroundImage: {
        'vibe-gradient': 'linear-gradient(135deg, #8b5cf6, #ec4899)',
        'calorie-gradient': 'linear-gradient(135deg, #10b981, #06b6d4)',
        'fridge-gradient': 'linear-gradient(135deg, #f59e0b, #ef4444)',
        'dish-gradient': 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
