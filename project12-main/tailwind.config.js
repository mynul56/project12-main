/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}"],
  theme: {
    screens: {
      'xs': '400px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        'primary-teal': '#00B9AE',
        'secondary-teal': '#22BFC9',
        'bg-light': '#E8FCFF',
        'bg-lightest': '#C9F1F9',
        'dark-text': '#1e2a4a',
      },
    },
  },
  plugins: [],
}
