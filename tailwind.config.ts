import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        conversia: {
          primary: "rgb(var(--conversia-primary-rgb) / <alpha-value>)",
          "primary-hover": "rgb(var(--conversia-primary-hover-rgb) / <alpha-value>)",
          dark: "rgb(var(--conversia-dark-rgb) / <alpha-value>)",
          darker: "rgb(var(--conversia-darker-rgb) / <alpha-value>)",
          teal: "rgb(var(--conversia-teal-rgb) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
