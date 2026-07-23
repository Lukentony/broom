export default {
  plugins: {
    tailwindcss: {
      content: ["./index.html", "./src/**/*.{js,jsx}"],
      theme: {
        extend: {
          colors: {
            // Palette Broom
            primary: {
              DEFAULT: '#2563eb', // Blue 600
              dark: '#1d4ed8'
            },
            accent: {
              success: '#22c55e', // Green 500
              warning: '#f59e0b', // Amber 500
              danger: '#ef4444',  // Red 500
              vacation: '#fbbf24' // Yellow 400
            },
            background: '#f8fafc', // Slate 50
            card: '#ffffff'
          }
        },
      },
      plugins: [],
    },
    autoprefixer: {},
  },
}
