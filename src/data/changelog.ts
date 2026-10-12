// Novità di ogni versione, scritte come le legge Paola: nel popup dopo un aggiornamento e in Impostazioni.
// Dalla più recente. Ogni aggiornamento che cambia qualcosa di visibile aggiunge una versione in cima:
// il numero dell'app è sempre quello della prima voce. Solo ciò che conta, in poche parole.

export interface ChangelogEntry {
  version: string;
  /** YYYY-MM-DD */
  date: string;
  items: string[];
}

export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    version: '1.2',
    date: '2026-10-12',
    items: ["L'unità di misura dei materiali si sceglie da un menù (pz, Fogli, Metri, cm, Rotoli, Confezioni, g, kg, ml), così sono sempre scritte allo stesso modo."],
  },
  {
    version: '1.1',
    date: '2026-10-12',
    items: [
      'Materiali con categorie e fornitori: ora puoi filtrarli, e dal pulsante "Categorie" rinominarli tutti insieme.',
      "Nei prodotti scegli prima la categoria del materiale e poi il materiale: l'inserimento è più rapido.",
      "Carica o scarica la giacenza a mano dall'icona sulla scheda del materiale (oppure imposta la quantità esatta).",
      "Tocca la foto di un materiale per ingrandirla. Se premi la X per toglierla, l'app ti chiede conferma.",
      'Aprendo un materiale da telefono la tastiera non parte più da sola.',
      'Nei campi numerici lo zero iniziale sparisce da solo quando scrivi.',
    ],
  },
  {
    version: '1.0',
    date: '2026-10-01',
    items: ['Prima versione di Lavoretty di Carta: ordini, prodotti, materiali, clienti e dashboard.'],
  },
];

export const APP_VERSION = CHANGELOG[0].version;

const KEY = 'lc-seen-version';

export function readSeenVersion(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function markVersionSeen(): void {
  try {
    localStorage.setItem(KEY, APP_VERSION);
  } catch {
    /* ignora */
  }
}

const num = (v: string) => v.split('.').map((n) => parseInt(n, 10) || 0);
function isNewer(a: string, b: string): boolean {
  const [x, y] = [num(a), num(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  }
  return false;
}

/** Versioni uscite dopo l'ultima vista. Chi apre l'app per la prima volta (tour da fare) non vede nulla. */
export function unseenChanges(seen: string | null, firstRun: boolean): ChangelogEntry[] {
  if (firstRun) return [];
  // chi aveva già l'app prima del versionamento parte dalla 1.0
  const from = seen ?? '1.0';
  return CHANGELOG.filter((e) => isNewer(e.version, from));
}
