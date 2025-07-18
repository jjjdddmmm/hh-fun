import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    borderRadius: {
      'none': '0px',
      'sm': '8px',
      'DEFAULT': '16px',
      'md': '16px',
      'lg': '24px',
      'xl': '24px',
      '2xl': '24px',
      '3xl': '24px',
      'full': '9999px',
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        heading: ['"Black Han Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      fontSize: {
        h1: ['4.5rem', { lineHeight: '1.2' }],
        h2: ['3.25rem', { lineHeight: '1.2' }],
        h3: ['2.75rem', { lineHeight: '1.2' }],
        h4: ['2.25rem', { lineHeight: '1.3' }],
        h5: ['1.75rem', { lineHeight: '1.4' }],
        h6: ['1.375rem', { lineHeight: '1.4' }],
        tagline: ['1rem', { lineHeight: '1.5' }],
        bodyLg: ['1.375rem', { lineHeight: '1.5' }],
        bodyMd: ['1.125rem', { lineHeight: '1.5' }],
        bodySm: ['1rem', { lineHeight: '1.5' }],
        bodyXs: ['0.875rem', { lineHeight: '1.5' }],
        bodyTiny: ['0.75rem', { lineHeight: '1.5' }],
      },
      colors: {
        // shadcn/ui colors
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
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
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
        // Design system color palette
        neutral: {
          white: '#FFFFFF',
          lightest: '#F2F2F2',
          lighter: '#BDBDBD',
          light: '#969696',
          base: '#404554',
          dark: '#2D2D2D',
          darker: '#1B1B1B',
          darkest: '#000000',
        },
        cinnabar: {
          lightest: '#F9CFCB',
          lighter: '#F4B0A4',
          light: '#EC716B',
          base: '#DE473D',
          dark: '#B53220',
          darker: '#842D1C',
          darkest: '#4A150C',
        },
        sunflower: {
          lightest: '#FDF1CB',
          lighter: '#FFE870',
          light: '#E2B636',
          base: '#B65F1F',
          dark: '#854F04',
          darker: '#4A3300',
        },
        turquoise: {
          lightest: '#BEFDF8',
          lighter: '#60F9F2',
          light: '#46E4D4',
          base: '#01D9B9',
          dark: '#00A88A',
          darker: '#004A3A',
        },
        violet: {
          lightest: '#F5E9FC',
          lighter: '#E1B2FA',
          light: '#B820D9',
          base: '#9716B8',
          dark: '#6F0C86',
          darker: '#3F0646',
        },
        lima: {
          lightest: '#F1FCDB',
          lighter: '#E1F4A4',
          light: '#C3E04B',
          base: '#7BC40C',
          dark: '#4F8400',
          darker: '#2A4600',
        },
      },
      boxShadow: {
        xxs: '0 1px 2px rgba(0, 0, 0, 0.05)',
        xs: '0 1px 3px rgba(0, 0, 0, 0.1)',
        sm: '0 1px 5px rgba(0, 0, 0, 0.12)',
        md: '0 4px 6px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px rgba(0, 0, 0, 0.12)',
        '2xl': '0 25px 50px rgba(0, 0, 0, 0.15)',
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
        "fade-in": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "none" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "none" },
        },
        shimmer: {
          "0%, 90%, 100%": {
            "background-position": "calc(-100% - var(--shimmer-width)) 0",
          },
          "30%, 60%": {
            "background-position": "calc(100% + var(--shimmer-width)) 0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 1000ms var(--animation-delay, 0ms) ease forwards",
        "fade-up": "fade-up 1000ms var(--animation-delay, 0ms) ease forwards",
        shimmer: "shimmer 8s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;