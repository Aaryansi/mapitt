/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#3AB0FF",
      },
      backdropBlur: {
        xs: "4px",
        sm: "8px",
        md: "20px",
      },
    },
  },
  // No extra plugins needed for filter/backdrop-blur
  plugins: [],
};
