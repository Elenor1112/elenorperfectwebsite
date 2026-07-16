import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#05060a',
        'ink-soft': '#0b0d14',
        paper: '#f4f4f0',
        // Brand palette resolves through CSS variables (RGB triplets defined
        // in globals.css) so the CMS theme settings can restyle the site
        // without a rebuild. <alpha-value> keeps /opacity modifiers working.
        brand: {
          DEFAULT: 'rgb(var(--color-brand) / <alpha-value>)',
          glow: 'rgb(var(--color-brand-glow) / <alpha-value>)',
          cyan: 'rgb(var(--color-brand-cyan) / <alpha-value>)',
          amber: 'rgb(var(--color-brand-amber) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '76rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-glow': {
          '0%,100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.8s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fade-in 0.2s ease-out both',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
