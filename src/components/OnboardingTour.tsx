// Tour guidato interattivo: oscura la pagina lasciando un "buco" sull'elemento da usare,
// con un fumetto che spiega cosa fa. Si avanza cliccando davvero sull'elemento indicato
// (per i passi di navigazione il click fa anche l'azione vera, es. cambia pagina).
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PrimaryButton } from '@/components/ui/primitives';

interface TourStep {
  target?: string; // valore dell'attributo data-tour da evidenziare; assente = passo centrale (benvenuto/fine)
  type?: 'navigate' | 'highlight'; // navigate: lascia passare il click vero. highlight: blocca l'azione, serve solo a spiegare
  title: string;
  text: string;
}

const STEPS: TourStep[] = [
  {
    title: 'Ciao! 👋',
    text:
      'Ti faccio fare un giro veloce di Lavoretty di Carta, così vedi dove trovare le cose. Clicca sui pulsanti evidenziati per andare avanti.',
  },
  {
    target: 'nav-clienti',
    type: 'navigate',
    title: 'Clienti',
    text: 'Qui trovi l\'elenco dei tuoi clienti: nome, telefono, Instagram e note. Clicca su "Clienti" per andare avanti.',
  },
  {
    target: 'btn-nuovo',
    type: 'highlight',
    title: 'Aggiungi',
    text: 'Con "+ Nuovo" aggiungi un nuovo elemento: funziona così in ogni sezione (clienti, materiali, prodotti, ordini). Clicca per continuare.',
  },
  {
    target: 'nav-materiali',
    type: 'navigate',
    title: 'Materiali',
    text: 'Qui gestisci il magazzino: materiali, quantita\' disponibili e costi. Clicca su "Materiali" per andare avanti.',
  },
  {
    target: 'btn-scontrino',
    type: 'highlight',
    title: 'Scontrino',
    text: 'Fotografa uno scontrino: riconosco gli articoli comprati e aggiorno in automatico le scorte di magazzino! Clicca per continuare.',
  },
  {
    target: 'nav-prodotti',
    type: 'navigate',
    title: 'Prodotti',
    text: 'Qui crei i prodotti da vendere, con prezzo e distinta base dei materiali usati. Clicca su "Prodotti" per andare avanti.',
  },
  {
    target: 'nav-ordini',
    type: 'navigate',
    title: 'Ordini',
    text: 'Qui gestisci preventivi e ordini, dallo stato "preventivo" a "consegnato". Clicca su "Ordini" per andare avanti.',
  },
  {
    target: 'nav-dashboard',
    type: 'navigate',
    title: 'Home',
    text: 'Torniamo alla Home: qui hai sempre il quadro generale del tuo lavoro. Clicca su "Home" per andare avanti.',
  },
  {
    target: 'btn-impostazioni',
    type: 'highlight',
    title: 'Impostazioni',
    text: 'Nelle Impostazioni trovi le tariffe orarie e altre opzioni dell\'app. Clicca per continuare.',
  },
  {
    target: 'btn-tema',
    type: 'highlight',
    title: 'Tema',
    text: 'Da qui puoi passare dal tema chiaro a quello scuro, quando vuoi. Clicca per continuare.',
  },
  {
    title: 'Tutto chiaro! ✂️',
    text: 'Ora sai dove trovare tutto. Buon lavoro con Lavoretty di Carta!',
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function findVisibleTarget(name: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

const PADDING = 6;

export function OnboardingTour({ active, onFinish }: { active: boolean; onFinish: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const stepRef = useRef<TourStep>(STEPS[0]);
  stepRef.current = STEPS[stepIndex];

  useEffect(() => {
    if (!active) return;
    setStepIndex(0);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const step = STEPS[stepIndex];

    function recompute() {
      if (!step.target) {
        setRect(null);
        return;
      }
      const el = findVisibleTarget(step.target);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top - PADDING, left: r.left - PADDING, width: r.width + PADDING * 2, height: r.height + PADDING * 2 });
    }

    recompute();
    const raf = requestAnimationFrame(recompute);
    window.addEventListener('resize', recompute);
    const interval = setInterval(recompute, 400);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', recompute);
      clearInterval(interval);
    };
  }, [active, stepIndex]);

  useEffect(() => {
    if (!active) return;
    const step = STEPS[stepIndex];
    if (!step.target) return;

    function onDocClick(e: MouseEvent) {
      const current = stepRef.current;
      if (!current.target) return;
      const el = findVisibleTarget(current.target);
      if (!el) return;
      const clickedTarget = (e.target as HTMLElement | null)?.closest(`[data-tour="${current.target}"]`);
      if (clickedTarget !== el) return;

      if (current.type === 'highlight') {
        e.preventDefault();
        e.stopPropagation();
      }
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }

    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [active, stepIndex]);

  if (!active) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;

  function next() {
    if (isLast) {
      onFinish();
    } else {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }
  }

  const bubble = (
    <div
      className="w-[min(320px,calc(100vw-2rem))] rounded-card border-2 border-lc-border bg-lc-card p-4 shadow-soft"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="font-display text-base font-semibold">{step.title}</p>
      <p className="mt-1 text-sm text-lc-muted">{step.text}</p>
      <div className="mt-3 flex items-center justify-between">
        <button onClick={onFinish} className="text-xs font-semibold text-lc-muted underline">
          Salta tour
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-lc-muted">
            {stepIndex + 1}/{STEPS.length}
          </span>
          {!step.target && (
            <PrimaryButton className="px-4 py-1.5 text-sm" onClick={next}>
              {isLast ? 'Fine' : 'Avanti'}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );

  // Passo centrale (benvenuto/fine): un solo overlay scuro con il fumetto al centro
  if (!rect) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-lc-accent-ink/60 p-4">{bubble}</div>,
      document.body
    );
  }

  const holeBottom = rect.top + rect.height;
  const holeRight = rect.left + rect.width;
  const spaceBelow = vh - holeBottom;
  const bubbleBelow = spaceBelow > 180;

  return createPortal(
    // pointer-events-none sul contenitore: altrimenti il suo riquadro (trasparente ma pur
    // sempre un elemento) intercetterebbe i click anche sopra il "buco", bloccando il click
    // sul vero pulsante della pagina. Solo le fasce scure e il fumetto devono catturare i click.
    <div className="pointer-events-none fixed inset-0 z-[100]">
      {/* 4 fasce scure attorno al buco: lasciano passare i click solo nel buco */}
      <div
        className="pointer-events-auto fixed bg-lc-accent-ink/60"
        style={{ top: 0, left: 0, width: '100%', height: Math.max(0, rect.top) }}
      />
      <div
        className="pointer-events-auto fixed bg-lc-accent-ink/60"
        style={{ top: holeBottom, left: 0, width: '100%', height: Math.max(0, vh - holeBottom) }}
      />
      <div
        className="pointer-events-auto fixed bg-lc-accent-ink/60"
        style={{ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height }}
      />
      <div
        className="pointer-events-auto fixed bg-lc-accent-ink/60"
        style={{ top: rect.top, left: holeRight, width: Math.max(0, vw - holeRight), height: rect.height }}
      />

      {/* Anello evidenziatore attorno al buco, non intercetta i click */}
      <div
        className="pointer-events-none fixed animate-pulse rounded-xl border-[3px] border-lc-accent"
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      />

      {/* Fumetto, posizionato sopra o sotto il buco in base allo spazio disponibile */}
      <div
        className="pointer-events-auto fixed"
        style={{
          top: bubbleBelow ? holeBottom + 10 : undefined,
          bottom: bubbleBelow ? undefined : Math.max(8, vh - rect.top + 10),
          left: Math.min(Math.max(8, rect.left), vw - 328),
        }}
      >
        {bubble}
      </div>
    </div>,
    document.body
  );
}
