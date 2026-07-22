# Broom 🧹

HomeSync è una PWA che mi ero fatto per gestire le pulizie con la mia compagna.
Volevo vedere se riuscivo a trasformarla in un'app per cellulare usando l'AI.
Broom è il risultato.

Funziona senza server: i dati stanno sul telefono e quando siete sulla stessa
WiFi si sincronizzano da soli. Una volta inquadrato un QR per abbinare i telefoni,
non ci pensi più.

Per ora è alla frutta eh, ma gira.

## Come gira

```bash
npm install
npm run dev        # sviluppo web
npm run build      # build
npx cap sync       # sync con Capacitor
npx cap open android  # apri in Android Studio
```

## Licenza

MIT — come l'originale HomeSync.
