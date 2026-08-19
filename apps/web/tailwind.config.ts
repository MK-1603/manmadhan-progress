import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./shared/**/*.{js,ts,jsx,tsx,mdx}",
    "./core/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        layer: {
          0: "var(--layer-0)",
          1: "var(--layer-1)",
          2: "var(--layer-2)",
          3: "var(--layer-3)",
          4: "var(--layer-4)",
          5: "var(--layer-5)",
          6: "var(--layer-6)",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          pressed: "var(--primary-pressed)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          hover: "var(--destructive-hover)",
          muted: "var(--destructive-muted)",
          foreground: "var(--destructive-foreground)",
        },
        danger: {
          DEFAULT: "var(--destructive)",
          hover: "var(--destructive-hover)",
          muted: "var(--destructive-muted)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
          subtle: "var(--border-subtle)",
          hover: "var(--border-hover)",
          focus: "var(--border-focus)",
        },
        divider: "var(--divider)",
        surface: {
          DEFAULT: "var(--surface)",
          card: "var(--surface-card)",
          elevated: "var(--surface-elevated)",
          hover: "var(--surface-hover)",
          active: "var(--surface-active)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          disabled: "var(--text-disabled)",
        },
        brand: {
          DEFAULT: "var(--gold)",
          hover: "var(--gold-hover)",
          pressed: "var(--gold-pressed)",
          soft: "rgba(212,175,55,0.10)",
          border: "rgba(212,175,55,0.30)",
        },
        input: "var(--input)",
        ring: "var(--ring)",
        gold: {
          DEFAULT: "var(--gold)",
          hover: "var(--gold-hover)",
          pressed: "var(--gold-pressed)",
        },
      },
      borderColor: {
        DEFAULT: "var(--border)",
      },
      divideColor: {
        DEFAULT: "var(--border)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        numeric: ["var(--font-geist)", "Geist", "Inter", "sans-serif"],
        geist: ["var(--font-geist)", "Geist", "Inter", "sans-serif"],
        mono: ["var(--font-geist)", "Geist", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "600",
        extrabold: "700",
        black: "700",
      },
    },
  },
  plugins: [],
};

export default config;
