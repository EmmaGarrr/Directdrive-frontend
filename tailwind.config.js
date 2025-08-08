/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        // BOLT Color Palette
        'bolt-black': '#020A18',
        'bolt-medium-black': '#10103C',
        'bolt-dark-purple': '#4322AA',
        'bolt-blue': '#135EE3',
        'bolt-cyan': '#68D8FC',
        'bolt-purple': '#B688FF',
        'bolt-white': '#F8F8FE',
        'bolt-mid-blue': '#005CFF',
        'bolt-light-blue': '#D1D8FA',
        'bolt-light-cyan': '#B2ECFF',
        'bolt-light-purple': '#C5B8FF',
        
        // Legacy colors (keep for compatibility)
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
        },
        coral: {
          '50': '#fef7f7',
          '100': '#fdeeed',
          '200': '#fbd5d2',
          '300': '#f7b3ae',
          '400': '#f18981',
          '500': '#e86058',
          '600': '#d4453a',
          '700': '#b6372e',
          '800': '#962f29',
          '900': '#7d2d28',
          '950': '#441511',
        },
        mint: {
          '50': '#f0fdf4',
          '100': '#dcfce7',
          '200': '#bbf7d0',
          '300': '#86efac',
          '400': '#4ade80',
          '500': '#22c55e',
          '600': '#16a34a',
          '700': '#15803d',
          '800': '#166534',
          '900': '#14532d',
          '950': '#052e16',
        }
      }
    },
  },
  plugins: [],
}

