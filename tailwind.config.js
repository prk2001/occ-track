/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Phase 36 — two-font editorial system.
        // `sans` (DM Sans) handles body + UI utility (buttons, labels, forms).
        // `display` (Fraunces) is the editorial face — H1s, pull quotes,
        //   drop caps. Variable axes (SOFT, WONK) are tuned per-utility in
        //   index.css via font-variation-settings.
        // `display-italic` exposes the same family pre-set to italic so we
        //   can keep using `font-display-italic` as a Tailwind utility.
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Fraunces"', '"DM Sans"', 'ui-serif', 'Georgia', 'serif'],
        'display-italic': ['"Fraunces"', '"DM Sans"', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        // Phase 36 — refined editorial palette. We keep the OCC brand
        // anchors (red/green) but deepen them into "ink red" + "forest"
        // and add a `ink-red` accent for editorial pulls. Light variants
        // are warmer (rose-tinted, not pink) to harmonize with cream paper.
        'sp-red': {
          DEFAULT: '#A8121F',   // deeper "ink red" (was #C8102E)
          bright: '#C8102E',    // the original brand red, kept for chips
          dark: '#7C0A14',      // burgundy for accents/deep pulls
          light: '#F8E4E6',     // warm rose tint
        },
        'occ-green': {
          DEFAULT: '#1B5E20',
          dark: '#0F3D14',
          light: '#E6EFE2',     // warmer green tint (was #E8F5E9)
          deep: '#0F3D14',
        },
        'lime': {
          DEFAULT: '#84CC16',
          dark: '#65A30D',
          light: '#ECFCCB',
        },
        'gold': {
          DEFAULT: '#A07020',   // deeper goldenrod for editorial accents
          bright: '#D97706',    // original gold, kept for warning chips
          light: '#F2E6C7',     // warmer cream-gold tint
          deep: '#7A5618',
        },
        'navy': {
          DEFAULT: '#111111',
          dark: '#0F172A',
        },
        'slate': {
          DEFAULT: '#475569',
          light: '#94A3B8',
        },
        // Paper-tone backgrounds — slightly more cream/warm than before.
        // `bg-paper` is the new default page background; bg-card is ivory.
        'bg-primary': '#FFFCF7',     // warm ivory (was pure white)
        'bg-card': '#FFFCF7',        // warm ivory cards
        'bg-cream': '#FAF4E8',       // a touch warmer (was #F4EDE0)
        'bg-paper': '#FAF4E8',       // alias for new paper-toned bg
        'bg-warm': '#F4ECD9',        // deeper warm tan
        'bg-dotted': '#F7F8F5',
        'bg-navy': '#0F172A',
        // Walnut-brown ink (warmer than pure black) feels printed, not pixel.
        'ink': { DEFAULT: '#1A0F0A', light: '#5A4B40', deep: '#0F0805' },
        'border-custom': '#E8DFD0',  // warm cream-tan border (was #E5E7EB cool gray)
        'border-warm': '#D9CDB5',
        'border-focus': '#A8121F',
        'border-deep': '#3D2C1F',    // for editorial rules (decorative dividers)
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
