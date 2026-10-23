import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#1447E6",
          hover: "#0F3BC4",
          light: "#EFF4FF",
          border: "#DBEAFE",
          container: "#0032B6",
          foreground: "#FFFFFF",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F1F5F9",
          card: "#FFFFFF",
          dim: "#EFF4FF",
        },
        "border-light": "#E2E8F0",
        "border-subtle": "#F1F5F9",
        "on-surface": {
          DEFAULT: "#0F172A",
          muted: "#64748B",
          subtle: "#94A3B8",
        },
        secondary: {
          DEFAULT: "#475569",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        accent: {
          DEFAULT: "#EFF4FF",
          foreground: "#1447E6",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
        xl: "0.75rem",
        "2xl": "1rem",
        full: "9999px",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
