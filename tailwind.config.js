/** @type {import('tailwindcss').Config} */

// import type { Config } from "tailwindcss";
import { heroui } from "@heroui/theme";
import tailwindcssAnimate from "tailwindcss-animate";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",

    // "./node_modules/@heroui/theme/dist/components/dropdown.js",
    "./node_modules/@heroui/theme/dist/components/(dropdown|drawer|chip).js",
  ],
  theme: {
    transparent: "transparent",
    current: "currentColor",
    screens: {
        mobileSM: '370px',
        mobile: '640px',
        tablet: '768px',
        smallLaptop: '1024px',
        desktop: '1280px',
        bigLaptop: '1440px',
        television: '1536px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    extend: {
      fontFamily: {
        // 'sharp-grotesk': ['Sharp Grotesk', 'cursive'],
        poppins: ['Poppins'],
      },
      
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        blue: "#008ED3",
        lightblue: "#D3FFFF",
        success: "#1EB62D",
        warning: "#FADB50",
        black: "#131414",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          blueLight: "var(--primary-blue-light)",
          black: "var(--primary-black)",
          blackLight: "var(--primary-black-light)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        'career-blue': {
          100: '#EDFFFF',
          200: '#D3FFFF',
          300: '#88D0FF',
          500: '#004174',
          800: '#008ED3',
          400: '#1A56DB'
        },
        'career-gray': {
          200: '#797979',
          300: '#F3F3F3',
          400: '#F9F9F9',
        },
        'career-black': {
          200: '#131414',
        },
        green: {
          900: '#1EB62D',
        },
        'blue-gray': {
          200: '#000000',
        },
        warning: '#E48F40',
        'warning-light': '#FFFAF5',
        success: '#1EB62D',
        'success-light': '#F0FFF1',
        neutral: '#797979',
        'tertiary': '#00BFF2',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [heroui(), tailwindcssAnimate],
};

module.exports = config;
