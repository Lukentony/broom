export default {
  plugins: {
    tailwindcss: {
      content: ["./index.html", "./src/**/*.{js,jsx}"],
      theme: {
        extend: {
          colors: {
            // Palette Broom — presa dai design token dell'originale HomeSync
            // (homesync-clean/app/lib/tokens.jsx), calda invece che fredda.
            primary: {
              DEFAULT: '#E2743A', // terracotta/ambra
              dark: '#B85A28',
              soft: '#FCE6D4',
              ink: '#7A2E0B',
            },
            accent: {
              success: '#6F9E7A', // alias di sage, per retrocompatibilità nomi esistenti
              warning: '#E0A93A',
              danger: '#D94B4B',
              vacation: '#E0A93A'
            },
            background: '#FBF6EE', // crema caldo
            'background-sunken': '#F4ECDD',
            card: '#ffffff',
            ink: {
              DEFAULT: '#2A1D14', // testo principale, marrone-prugna scuro
              2: '#6B5B4F',       // testo secondario
              3: '#A89A8B',       // testo terziario/placeholder
            },
            hairline: 'rgba(42,29,20,0.08)',
            sage:    { DEFAULT: '#6F9E7A', soft: '#E4EFDF', ink: '#2E5536' },   // ok/done
            urgent:  { DEFAULT: '#D94B4B', soft: '#FBE0DC', ink: '#7A1E1E' },   // scaduto/oggi
            soon:    { DEFAULT: '#E0A93A', soft: '#FBEFD0', ink: '#6D4A0E' },   // in scadenza
            overdue: { DEFAULT: '#8C5AC8', soft: '#EFE2F7', ink: '#432970' },   // scaduto da giorni
          },
          fontFamily: {
            sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            display: ['Fraunces', 'Georgia', 'serif'],
          },
        },
      },
      plugins: [],
    },
    autoprefixer: {},
  },
}
