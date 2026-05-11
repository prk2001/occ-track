/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'sp-red': {
          DEFAULT: '#C8102E',
          dark: '#A00D24',
          light: '#FDE8EB',
        },
        'occ-green': {
          DEFAULT: '#1A6B3C',
          dark: '#14522E',
          light: '#E6F5EC',
        },
        'gold': {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
        },
        'navy': {
          DEFAULT: '#1E293B',
          dark: '#0F172A',
        },
        'slate': {
          DEFAULT: '#475569',
          light: '#94A3B8',
        },
        'bg-primary': '#F8FAFC',
        'bg-card': '#FFFFFF',
        'bg-navy': '#0F172A',
        'border-custom': '#E2E8F0',
        'border-focus': '#C8102E',
        'blue-accent': '#2563EB',
        'blue-light': '#EFF6FF',
        'purple-accent': '#7C3AED',
        'purple-light': '#F3EEFD',
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        '2xl': '16px',
        'xl': '12px',
        'lg': "var(--radius)",
        'md': "calc(var(--radius) - 2px)",
        'sm': "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
        'card-elevated': '0 4px 6px rgba(0,0,0,0.07), 0 12px 24px rgba(0,0,0,0.06)',
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "pulse-live": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.5)", opacity: "0.5" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "slide-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "count-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "pulse-live": "pulse-live 2s ease-in-out infinite",
        "shimmer": "shimmer 1.5s linear infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "count-pulse": "count-pulse 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
