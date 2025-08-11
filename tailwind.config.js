/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
    "./src/app/admin-panel/**/*.{html,ts,scss}",
    "./src/app/shared/**/*.{html,ts,scss}"
  ],
  theme: {
    extend: {
      spacing: {
        '15': '3.75rem',    // 60px - for collapsed sidebar width
        '70': '17.5rem',    // 280px - for expanded sidebar width
        '72': '18rem',      // 288px - alternative width
        '80': '20rem',      // 320px - for larger screens
        '88': '22rem',      // 352px - for extra large screens
      },
      width: {
        '15': '3.75rem',
        '70': '17.5rem',
        '72': '18rem',
        '80': '20rem',
        '88': '22rem',
      },
      height: {
        '15': '3.75rem',
        '18': '4.5rem',
        '22': '5.5rem',
      },
      colors: {
        // Admin Color System
        admin: {
          'sidebar-bg': '#f8fafc',
          'sidebar-bg-dark': '#1e293b',
          'sidebar-border': '#e2e8f0',
          'sidebar-border-dark': '#374151',
          'content-bg': '#ffffff',
          'content-bg-dark': '#111827',
          'card-bg': '#ffffff',
          'card-bg-dark': '#1f2937',
          'text-primary': '#1e293b',
          'text-primary-dark': '#f1f5f9',
          'text-secondary': '#64748b',
          'text-secondary-dark': '#94a3b8',
          'accent-primary': '#3b82f6',
          'accent-secondary': '#10b981',
          'accent-warning': '#f59e0b',
          'accent-danger': '#ef4444',
        },
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

