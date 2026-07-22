# Broom 🧹

**Dai post-it passivo-aggressivi sul frigo a un'app mobile P2P — costruita con
l'AI come mia tutor.**

Tutto è iniziato con un problema banale: io e la mia compagna non
ricordavamo mai chi avesse pulito cosa, e il frigo era pieno di bigliettini
passivo-aggressivi. Così mi sono creato HomeSync, una PWA per gestire le pulizie.

Poi ho pensato: "E se usassi questo progetto per testare le mie capacità con
l'AI e trasformarlo in un'app per cellulare?" Non ero un mobile developer.
Ma nel 2025 puoi sederti con Claude, GPT, e un sacco di caffè, e imparare
facendo. Ogni riga della trasformazione — sync CRDT, abbinamento QR,
persistenza offline — è stata scritta con AI pair programming. L'AI è stata
la mia tutor, la mia code reviewer e la mia rubber duck.

**Questo repository è un fork di [HomeSync](https://github.com/Lukentony/homesync)**,
l'app originale che mi ero fatto per le pulizie di casa. Il fork esiste perché
volevo la libertà di sperimentare. Il codice non è perfetto, ma mi ha insegnato
più di qualsiasi corso.

## Build

```bash
npm install
npm run dev        # sviluppo web
npm run build      # build
npx cap sync       # sync con Capacitor
npx cap open android  # apri in Android Studio
```

## Roba tecnica

- **Frontend**: React, Tailwind, Vite
- **Wrapper**: Capacitor (Android)
- **Sync**: CRDT (Automerge), automatica sulla stessa WiFi
- **Test**: Vitest + fast-check

## Licenza

MIT — come l'originale HomeSync.
