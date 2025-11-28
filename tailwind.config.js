import preset from "solid-ui/tailwind-preset";
import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],

  content: [
    "./src/**/*.{ts,tsx,js,jsx}",
    "./node_modules/solid-ui/dist/**/*.{js,ts,jsx,tsx}",
  ],

  plugins: [animate],
};