import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // Teal - professional and fresh
          50: "#e6f7f9",
          100: "#cceff3",
          200: "#99dfe7",
          300: "#66cfdb",
          400: "#33bfcf",
          500: "#00afc3",
          600: "#007280", // Main brand - deep teal
          700: "#005f6b",
          800: "#004c56",
          900: "#003941",
          950: "#00262c",
        },
        gold: {
          // Goudgeel - energetic and warm background
          50: "#fef9e6",
          100: "#fdf3cc",
          200: "#fbe799",
          300: "#f9db66",
          400: "#f7cf33",
          500: "#f5c300",
          600: "#F8B600", // Main gold background
          700: "#c59200",
          800: "#926d00",
          900: "#5f4900",
          950: "#2c2400",
        },
        orange: {
          // Helder oranje - lively and rhythmic
          50: "#fff4e6",
          100: "#fee9cc",
          200: "#fdd399",
          300: "#fcbd66",
          400: "#fba733",
          500: "#FAA32C", // Main orange accent
          600: "#e89110",
          700: "#b5710c",
          800: "#825108",
          900: "#4f3104",
          950: "#1c1101",
        },
        red: {
          // Krachtig rood - passion and focus
          50: "#fde9eb",
          100: "#fbd3d7",
          200: "#f7a7af",
          300: "#f37b87",
          400: "#ef4f5f",
          500: "#E63946", // Main red accent
          600: "#d11827",
          700: "#a1121f",
          800: "#710d16",
          900: "#41070d",
          950: "#110204",
        },
        dark: {
          // Zwart - minimalist and sleek
          DEFAULT: "#191919",
          50: "#f2f2f2",
          100: "#e6e6e6",
          200: "#cccccc",
          300: "#b3b3b3",
          400: "#999999",
          500: "#808080",
          600: "#666666",
          700: "#4d4d4d",
          800: "#333333",
          900: "#191919", // Primary dark
          950: "#0d0d0d",
        },
        brown: {
          // Warm bruin - balance and depth
          50: "#f5f1ee",
          100: "#ebe3dd",
          200: "#d7c7bb",
          300: "#c3ab99",
          400: "#af8f77",
          500: "#9b7355",
          600: "#705040", // Neutral brown
          700: "#5a4033",
          800: "#443026",
          900: "#2e2019",
          950: "#18100c",
        },
      },
      backgroundColor: {
        "dark-secondary": "#1a1a25",
        "dark-tertiary": "#25252f",
      },
    },
  },
  plugins: [],
};

export default config;
