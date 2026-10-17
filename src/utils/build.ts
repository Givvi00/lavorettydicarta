/** Codice del deploy (inizio dell'hash del commit) e quando è stato costruito: serve a controllare che la versione online sia quella giusta */
export const BUILD_ID = __BUILD_ID__;
export const BUILD_DATE = new Date(__BUILD_DATE__).toLocaleString('it-IT', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
