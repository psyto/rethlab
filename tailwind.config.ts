import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        fabrknt: {
          cyan: '#00f0ff',
          'cyan-light': '#5cffff',
          magenta: '#ff00aa',
          'magenta-light': '#ff5cc8',
          yellow: '#facc15',
          crit: '#ff3b3b',
          /* Aliases retained for backward compatibility with existing call sites
             that still reference orange/orange-light. New code should use the
             cyan/magenta tokens above. */
          orange: '#00f0ff',
          'orange-light': '#5cffff',
          dark: '#050507',
          surface: '#0b0b12',
          elevated: '#14141e',
          muted: '#9ca3af',
          dim: '#4b5563',
        },
        xp: {
          bronze: '#CD7F32',
          silver: '#C0C0C0',
          gold: '#FFD700',
          diamond: '#B9F2FF',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      backgroundImage: {
        'fabrknt-gradient': 'linear-gradient(135deg, #00f0ff 0%, #ff00aa 100%)',
        'fabrknt-gradient-subtle': 'linear-gradient(135deg, rgba(0,240,255,0.08) 0%, rgba(255,0,170,0.08) 100%)',
      },
      keyframes: {
        'xp-fill': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--xp-progress)' },
        },
        'streak-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'xp-fill': 'xp-fill 1s ease-out forwards',
        'streak-pulse': 'streak-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
