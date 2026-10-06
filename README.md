# Lavoretty di Carta — Gestionale

App interna (non pubblica) per gestire il lavoro con la Cricut: clienti, ordini/preventivi, materiali in magazzino e distinta base dei prodotti.

Stack: React + TypeScript + Vite + Tailwind + Zustand + IndexedDB (via `idb`), stesso impianto di mcdonaldz-tracker. Pensata per funzionare da telefono e da Mac nel browser.

## Avvio

```bash
npm install
npm run dev
```

Apri l'indirizzo mostrato in terminale (di solito http://localhost:5173). Su Mac funziona allo stesso modo; per usarla da telefono sulla stessa rete wifi lancia `npm run dev -- --host` e apri l'IP del Mac mostrato in output.

## Dati

Tutto è salvato in locale nel browser (IndexedDB) — nessun account richiesto, funziona offline. I dati restano sul dispositivo/browser in cui viene usata l'app.

## Modulo cloud (opzionale, fase 2)

Il codice è pronto per aggiungere una sincronizzazione Supabase in un secondo momento (così i dati siano visibili sia da telefono che da Mac automaticamente). Per collegarla:

1. Crea un progetto gratuito su [supabase.com](https://supabase.com)
2. Prendi `Project URL` e `anon public key` dalle impostazioni API
3. Fammelo sapere e aggiungo il layer di sync (stesso pattern di mcdonaldz-tracker: locale come fonte di verità, sync in background verso Supabase)

## Struttura

- `src/types.ts` — modello dati (clienti, materiali, prodotti con distinta base, ordini)
- `src/services/db.ts` — persistenza IndexedDB
- `src/store/useStore.ts` — store Zustand (CRUD)
- `src/utils/calc.ts` — calcolo costi/margini/totali
- `src/pages/` — Dashboard, Clienti, Materiali, Prodotti, Ordini
- `src/components/ui/` — componenti UI riutilizzabili
