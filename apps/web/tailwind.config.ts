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
          foreground: "var(--destructive-foreground)",
        },
        border: {
          DEFAULT: "var(--border)",
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
          soft: "rgba(216,165,43,0.10)",
          border: "rgba(216,165,43,0.30)",
        },
        input: "var(--input)",
        ring: "var(--ring)",
        gold: {
          DEFAULT: "var(--gold)",
          hover: "var(--gold-hover)",
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
        sans: ["Geist", "SF Pro Display", "Inter", "system-ui", "sans-serif"],
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
