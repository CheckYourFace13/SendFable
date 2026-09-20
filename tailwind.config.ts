import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Fraunces", "ui-serif", "Georgia", "serif"],
      },
      colors: {
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
        ink: {
          DEFAULT: "#0F1B2D",
          soft: "#243449",
        },
        coral: {
          DEFAULT: "#E85A3C",
          solid: "#C44732", // interactive fills — AA contrast with white
          hover: "#A83B2A",
        },
        teal: {
          DEFAULT: "#0F7A72",
          soft: "#1A948A",
        },
        sky: {
          DEFAULT: "#2B6CB0",
          soft: "#3B82C4",
        },
        parchment: "#EEF6F5",
        lavender: "#EEF6F5",
        page: "#FAFBFC",
        surface: "#FFFFFF",
        charcoal: "#162033",
        success: "#1B7F4E",
        warning: "#B45309",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontSize: {
        "display-xl": ["clamp(2.5rem, 5vw, 4.25rem)", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "display-lg": ["clamp(2rem, 3.5vw, 3.25rem)", { lineHeight: "1.1", letterSpacing: "-0.025em" }],
        "display-md": ["clamp(1.5rem, 2.5vw, 2.25rem)", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
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
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.5s ease-out both",
      },
      maxWidth: {
        prose: "40rem",
        content: "72rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
