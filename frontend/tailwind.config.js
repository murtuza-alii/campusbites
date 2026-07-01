/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#6366F1', // Modern Indigo
          hover: '#4F46E5',
          light: '#818CF8',
          subtle: 'rgba(99, 102, 241, 0.15)',
        },
        neutral: {
          bg1: 'hsl(222, 47%, 7%)',     // Midnight Obsidian
          bg2: 'hsl(222, 47%, 10%)',
          bg3: 'hsl(222, 47%, 13%)',
          bg4: 'hsl(222, 40%, 18%)',
          bg5: 'hsl(222, 40%, 22%)',
          bg6: 'hsl(222, 40%, 26%)',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
        border: {
          subtle: 'hsla(0, 0%, 100%, 0.06)',
          DEFAULT: 'hsla(0, 0%, 100%, 0.10)',
          strong: 'hsla(0, 0%, 100%, 0.18)',
        },
        status: {
          success: '#10B981', // Emerald Green
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        },
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        glow: '0 0 20px rgba(99, 102, 241, 0.25)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.25)',
        'glow-lg': '0 0 40px rgba(99, 102, 241, 0.35)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
};
