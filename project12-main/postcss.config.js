module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      // Ensure all browser prefixes are included
      overrideBrowserslist: ['> 1%', 'last 2 versions', 'Firefox ESR', 'not dead']
    },
  }
}
