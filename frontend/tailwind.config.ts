import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "var(--background)",
          secondary: "var(--background-secondary)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          hover: "var(--surface-hover)",
          elevated: "var(--surface-elevated)",
          active: "#2a4058",
        },
        // Amber/Orange accent (hex - same for both themes, needs opacity modifiers)
        primary: {
          DEFAULT: "#F59E0B",
          hover: "#D97706",
          light: "#FBBF24",
          muted: "rgba(245, 158, 11, 0.15)",
        },
        // Secondary accents
        secondary: {
          DEFAULT: "#1B84FF",
          hover: "#0066DD",
        },
        accent: {
          green: "#10b981",
          blue: "#3b82f6",
          purple: "#8b5cf6",
          orange: "#f59e0b",
          pink: "#ec4899",
          teal: "#14b8a6",
        },
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        input: {
          DEFAULT: "var(--input-bg)",
          border: "var(--input-border)",
        },
        ring: {
          DEFAULT: "var(--ring)",
        },
        border: {
          DEFAULT: "var(--border)",
          light: "#3d5a7a",
          dark: "#152332",
        },
        // Node-specific colors (always the same regardless of theme)
        node: {
          trigger: "#f59e0b",
          action: "#3b82f6",
          ai: "#8b5cf6",
          logic: "#10b981",
          output: "#ec4899",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        'node': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'node-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
        'glow': '0 0 20px rgba(245, 158, 11, 0.3)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(245, 158, 11, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.5)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
