/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        astronaut: {
          '50': '#f1f5fd',
          '100': '#e0eaf9',
          '200': '#c8daf5',
          '300': '#a2c3ee',
          '400': '#75a2e5',
          '500': '#5582dc',
          '600': '#4066d0',
          '700': '#3754be',
          '800': '#32469b',
          '900': '#2b3b76',
          '950': '#1f284c',
        }
      }
    },
  },
  plugins: [],
}

