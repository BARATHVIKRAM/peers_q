/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#020B18',
          900: '#060F1F',
          800: '#0A1628',
          700: '#0F1F38',
          600: '#162848',
          500: '#1E3A5F',
          400: '#2A5080',
          300: '#3A6FA0'
        },
        electric: {
          blue: '#4FC3F7',
          cyan: '#00E5FF',
          purple: '#7C3AED',
          violet: '#A855F7'
        },
        accent: {
          gold: '#FFD700',
          coral: '#FF6B6B',
          mint: '#00E5CC',
          pink: '#FF4DC4'
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pop': 'pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'countdown': 'countdown linear forwards',
        'shimmer': 'shimmer 2s linear infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        glow: {
          'from': { boxShadow: '0 0 20px rgba(79, 195, 247, 0.3)' },
          'to': { boxShadow: '0 0 40px rgba(79, 195, 247, 0.8)' }
        },
        slideUp: {
          'from': { transform: 'translateY(30px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' }
        },
        slideIn: {
          'from': { transform: 'translateX(-20px)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' }
        },
        pop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(79,195,247,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(79,195,247,0.05) 1px, transparent 1px)',
        'glow-radial': 'radial-gradient(ellipse at center, rgba(79,195,247,0.15) 0%, transparent 70%)'
      }
    }
  },
  plugins: []
}
