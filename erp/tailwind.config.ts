import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Rojo corporativo Mudanzas Metepec
        brand: {
          50: "#fef2f2",
          100: "#fde3e3",
          200: "#fbcbcb",
          300: "#f7a3a3",
          400: "#ef6b6b",
          500: "#e43d3d",
          600: "#cf1f1f",
          700: "#ad1717",
          800: "#8f1717",
          900: "#771a1a",
          950: "#410808",
        },
        ink: {
          DEFAULT: "#111316",
          soft: "#1c1f24",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
