# Broom

**Broom** è un'app mobile local-first per la gestione collaborativa delle pulizie domestiche.
Progettata per coppie e coinquilini: tengo traccia dei task, assegna i compiti, calcola
punteggi e mostra chi sta facendo la propria parte — tutto senza un server cloud.

## Architettura

> Local-first con CRDT (Automerge). Nessun backend. Sync P2P diretta tra telefoni.

- **Stato = documento**: lo stato dell'app è un documento Automerge (CRDT) salvato
  localmente sul telefono. Niente database, niente migrazioni.
- **Dati derivati**: punteggi, scadenze e assegnazioni sono calcolati al volo dai
  fatti (completamenti, task, utenti). Il merge è sempre banale.
- **Sync automatica**: pairing QR una tantum, poi sync automatica via LAN.
  L'utente non fa nulla.
- **Offline-first**: tutto funziona senza connessione. La sync è solo per
  allinearsi con l'altro telefono.

## Stack

| Layer | Tecnologia |
|-------|-----------|
| UI | React 18, Tailwind CSS, Lucide React |
| Bundler | Vite |
| Mobile wrapper | Capacitor (Android, iOS) |
| CRDT | Automerge |
| Test | Vitest, fast-check (property-based) |

## Quick Start

```bash
npm install
npm run dev       # sviluppo web su localhost:3000
npm run build     # build per produzione
npx cap sync      # sync con Capacitor
npx cap open android  # apri Android Studio
```

## Perché Broom?

Broom nasce da HomeSync, un progetto che usavo con la mia compagna per gestire
le pulizie di casa. L'ho riscritto da zero come app mobile local-first per
imparare CRDT e sync P2P — ed è finito nel portfolio.

## License

MIT
