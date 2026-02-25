/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand palette
        brand: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#5c7cfa',
          600: '#4c6ef5',
          700: '#4263eb',
          800: '#3b5bdb',
          900: '#364fc7',
        },
        // Reading themes
        sepia: {
          bg: '#f4ecd8',
          text: '#5b4636',
          card: '#efe6d5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'serif'],
        reading: ['Merriweather', 'Georgia', 'serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
          },
        },
      },
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
