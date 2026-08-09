export const tokens = {
  brand: {
    name: "ManMadhan Progress",
    tagline: "Enterprise Typography & Design System Specification",
    version: "v3.0.0-TYPOGRAPHY",
  },
  
  // 1. Systematic 10-step Gold Color Scale
  colors: {
    gold: {
      50: "#FBF8EF",
      100: "#F6ECCC",
      200: "#F1DFAB",
      300: "#E7CB7B",
      400: "#DDB85A",
      500: "#C89B3C",
      600: "#B8860B",
      700: "#976F08",
      800: "#705305",
      900: "#4A3703",
    },
    
    surface: {
      light: {
        background: "#FCFCFA",
        surface: "#FFFFFF",
        secondarySurface: "#F6F6F4",
      },
      dark: {
        background: "#0B0C0E",
        surface: "#131518",
        secondarySurface: "#1A1D21",
      },
    },

    // Text Contrast Scale (WCAG 2.2 AA Compliant)
    text: {
      light: {
        primary: "#111111",
        secondary: "#5F6368",
        muted: "#8A8A93",
        disabled: "#B8B8BE",
      },
      dark: {
        primary: "#F3F4F6",
        secondary: "#9CA3AF",
        muted: "#6B7280",
        disabled: "#4B5563",
      },
    },

    border: {
      light: {
        neutral: "#E6E6E3",
        strong: "#D1D1CD",
        divider: "#EEEEEC",
        active: "#C89B3C",
      },
      dark: {
        neutral: "#272A30",
        strong: "#3B3F47",
        divider: "#1F2227",
        active: "#C89B3C",
      },
    },

    semantic: {
      success: "#16A34A",
      warning: "#F59E0B",
      error: "#DC2626",
      info: "#2563EB",
    },
  },

  // 2. Canonical Typography System (Inter Font Stack)
  typography: {
    fontFamily: {
      sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace',
    },
    scale: {
      display:   { size: "48px", weight: "700", lineHeight: "56px", usage: "Marketing / Hero" },
      h1:        { size: "36px", weight: "700", lineHeight: "44px", usage: "Page Title" },
      h2:        { size: "30px", weight: "700", lineHeight: "38px", usage: "Section Title" },
      h3:        { size: "24px", weight: "600", lineHeight: "32px", usage: "Card Title" },
      h4:        { size: "20px", weight: "600", lineHeight: "28px", usage: "Subsection" },
      bodyLarge: { size: "18px", weight: "400", lineHeight: "28px", usage: "Important Content" },
      body:      { size: "16px", weight: "400", lineHeight: "24px", usage: "Default Text" },
      label:     { size: "15px", weight: "500", lineHeight: "22px", usage: "Sidebar / Forms" },
      small:     { size: "14px", weight: "400", lineHeight: "20px", usage: "Secondary Text" },
      caption:   { size: "12px", weight: "500", lineHeight: "18px", usage: "Metadata" },
    },
    weights: {
      400: "Body Text",
      500: "Labels & Navigation",
      600: "Buttons & Card Titles",
      700: "Headings",
    },
    letterSpacing: {
      headings: "0em",
      body: "0em",
      labels: "0.01em",
      uppercase: "0.04em",
    },
  },

  spacing: {
    4: "4px",
    8: "8px",
    12: "12px",
    16: "16px",
    24: "24px",
    32: "32px",
    40: "40px",
    48: "48px",
    64: "64px",
    80: "80px",
    96: "96px",
  },

  radius: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    full: "9999px",
  },

  elevation: {
    level1: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
    level2: "0 4px 12px -2px rgba(0, 0, 0, 0.08)",
    level3: "0 12px 24px -4px rgba(0, 0, 0, 0.12)",
    level4: "0 20px 32px -6px rgba(0, 0, 0, 0.16)",
  },

  motion: {
    fast: "150ms",
    normal: "200ms",
    slow: "300ms",
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  },

  iconSizes: {
    16: "16px",
    20: "20px",
    24: "24px",
    32: "32px",
    48: "48px",
  },
};
