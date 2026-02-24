/* eslint-disable import/no-anonymous-default-export */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "./src/**/*.{js,jsx}"],
  mode: "jit",
  theme: {
    extend: {
      colors: {
        primary: "#F7F2FA",
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
      keyframes: {
        scalePulse: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        scalePulse: "scalePulse 2s ease-out infinite",
      },
    },
    screens: {
      sm: "640px", // Small devices (phones ≥640px)
      md: "768px", // Medium devices (tablets ≥768px)
      lg: "1024px", // Large devices (laptops ≥1024px)
      xl: "1280px",
    },
  },
  plugins: [],
};
