/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        safari: {
          50: '#FDFCF7',
          100: '#FAF6ED',
          200: '#F4ECE0',
          300: '#E8DCC8',
          400: '#D5C4A8',
          500: '#BFA886',
          800: '#4A3E35',
          900: '#2C241E',
        },
        jungle: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
        },
        amber: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        bone: {
          50: '#FAF8F2',
          100: '#F3EFE0',
          200: '#E5DFC8',
          300: '#D4CCAE',
          500: '#A49975',
        },
        terracotta: {
          100: '#FFEDD5',
          400: '#FB923C',
          500: '#EA580C',
          600: '#C2410C',
        }
      },
      fontFamily: {
        bubble: ['Fredoka', 'Nunito', 'system-ui', 'sans-serif'],
        sans: ['Nunito', 'Fredoka', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'playful': '0 8px 0px 0px rgba(0,0,0,0.08), 0 12px 20px -4px rgba(0,0,0,0.06)',
        'playful-sm': '0 4px 0px 0px rgba(0,0,0,0.08)',
        'playful-lg': '0 12px 0px 0px rgba(0,0,0,0.08), 0 20px 25px -5px rgba(0,0,0,0.08)',
        'bone': '0 6px 0px 0px #D4CCAE, 0 10px 15px -3px rgba(0,0,0,0.05)',
      }
    },
  },
  plugins: [],
}
