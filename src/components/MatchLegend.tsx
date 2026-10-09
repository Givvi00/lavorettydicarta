import { Badge } from '@/components/ui/primitives';

export type Confidence = 'high' | 'medium' | 'low';

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'Trovato',
  medium: 'Da controllare',
  low: 'Non trovato',
};
export const CONFIDENCE_TONE: Record<Confidence, 'success' | 'accent' | 'danger'> = {
  high: 'success',
  medium: 'accent',
  low: 'danger',
};
export const CONFIDENCE_CARD: Record<Confidence, string> = {
  high: 'border-lc-success/40 bg-lc-success/5',
  medium: 'border-lc-accent/60 bg-lc-accent/5',
  low: 'border-lc-danger/40 bg-lc-danger/5',
};

/** Spiega i colori usati nelle schermate di compilazione automatica (scontrino, "Racconta"). */
export function MatchLegend({ what, notFound }: { what: string; notFound: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-btn bg-lc-bg p-2.5 text-xs text-lc-muted">
      <p className="font-semibold text-lc-text">Come leggere i colori</p>
      <p>
        <Badge tone="success">Verde</Badge> <strong className="text-lc-text">Trovato</strong>: ho riconosciuto con
        sicurezza {what} che hai già. Non devi fare nulla.
      </p>
      <p>
        <Badge tone="accent">Giallo</Badge> <strong className="text-lc-text">Da controllare</strong>: ho trovato
        qualcosa di simile ma non sono sicuro. Controlla che sia quello giusto, altrimenti scegli tu quello corretto
        dall'elenco.
      </p>
      <p>
        <Badge tone="danger">Rosso</Badge> <strong className="text-lc-text">Non trovato</strong>: non c'è niente di
        simile. {notFound}
      </p>
    </div>
  );
}
