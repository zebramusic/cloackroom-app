// During Vitest runs we don't need (and Vite may not accept) the Tailwind PostCSS plugin string reference.
// Detect test environment and provide empty plugin list to avoid 'Invalid PostCSS Plugin' errors.
const isTest = process.env.VITEST;
const config = {
  plugins: isTest ? [] : ["@tailwindcss/postcss"],
};

export default config;
