import { useEffect, useRef, useState } from 'react';
import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';

export type TapeColor = 'yellow' | 'pink' | 'mint' | 'sky' | 'lilac' | 'peach';

// Una "pagina di carta". tape = striscia di washi tape incollata sopra, lift = si solleva al passaggio.
export function Card({
  children,
  className = '',
  tape,
  lift = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  tape?: TapeColor;
  lift?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`relative rounded-card border border-lc-border bg-lc-card p-4 shadow-card ${
        lift ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift' : ''
      } ${className}`}
    >
      {tape && <span aria-hidden className={`lc-tape lc-tape-${tape}`} />}
      {children}
    </div>
  );
}

export function PrimaryButton({
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`whitespace-nowrap rounded-blob bg-lc-accent px-4 py-2.5 font-display sm:px-5 font-semibold text-lc-accent-text shadow-press ring-1 ring-inset ring-white/40 transition-[transform,filter,box-shadow] hover:brightness-105 active:shadow-press-down active:translate-y-[3px] disabled:opacity-50 disabled:active:translate-y-0 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`whitespace-nowrap rounded-blob border-2 border-lc-border bg-lc-surface px-4 py-2.5 font-display sm:px-5 font-semibold text-lc-text transition-[transform,border-color] hover:border-lc-accent active:translate-y-0.5 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function DangerButton({
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`whitespace-nowrap rounded-blob bg-lc-danger px-4 py-2.5 font-display sm:px-5 font-semibold text-white transition-transform active:translate-y-0.5 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-left">
      <span className="text-sm font-semibold text-lc-muted">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-btn border-2 border-lc-border bg-lc-surface px-3 py-2 text-lc-text outline-none transition-[border-color,box-shadow] focus:border-lc-accent focus:ring-4 focus:ring-lc-accent/25 ${props.className ?? ''}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`rounded-btn border-2 border-lc-border bg-lc-surface px-3 py-2 text-lc-text outline-none transition-[border-color,box-shadow] focus:border-lc-accent focus:ring-4 focus:ring-lc-accent/25 ${props.className ?? ''}`}
    />
  );
}

export function Select({
  children,
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-btn border-2 border-lc-border bg-lc-surface px-3 py-2 text-lc-text outline-none transition-[border-color,box-shadow] focus:border-lc-accent focus:ring-4 focus:ring-lc-accent/25 ${className}`}
    >
      {children}
    </select>
  );
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'success' | 'danger' | 'accent' | 'pink';
}) {
  const toneClass = {
    default: 'bg-lc-border/50 text-lc-text',
    success: 'bg-lc-success/15 text-lc-success',
    danger: 'bg-lc-danger/15 text-lc-danger',
    accent: 'bg-lc-accent/25 text-lc-olive',
    pink: 'bg-lc-pink/20 text-lc-pink',
  }[tone];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${toneClass}`}>{children}</span>
  );
}

export function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="col-span-full flex flex-col items-center gap-2 rounded-card border-2 border-dashed border-lc-border py-10 text-center">
      <div className="text-3xl opacity-70">{icon}</div>
      <p className="text-sm text-lc-muted">{text}</p>
    </div>
  );
}

// Valori attuali di tutti i campi dentro la finestra, per capire se l'utente ha cambiato qualcosa.
function snapshotFields(root: HTMLElement | null): string {
  if (!root) return '';
  const values: string[] = [];
  root.querySelectorAll('input, textarea, select, img').forEach((el) => {
    if (el instanceof HTMLInputElement) {
      if (el.type === 'file') return;
      values.push(el.type === 'checkbox' || el.type === 'radio' ? String(el.checked) : el.value);
    } else if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      values.push(el.value);
    } else if (el instanceof HTMLImageElement) {
      values.push(el.src);
    }
  });
  return JSON.stringify(values);
}

// Si esce solo con la ✕ (mai cliccando fuori, per non perdere per sbaglio quello che si sta compilando).
// Con confirmClose (default) la ✕ chiede conferma, ma solo se i campi sono cambiati rispetto a quando la
// finestra si è aperta: se non è stato modificato nulla si chiude subito. Il contenuto resta montato sotto,
// quindi scegliendo "Continua" non si perde nulla. Passa confirmClose={false} dove non c'è mai nulla da perdere.
export function Modal({
  open,
  onClose,
  title,
  children,
  confirmClose = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  confirmClose?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const baseline = useRef<string | null>(null);

  useEffect(() => {
    baseline.current = open ? snapshotFields(panelRef.current) : null;
  }, [open]);

  if (!open) return null;

  function requestClose() {
    const unchanged = baseline.current !== null && snapshotFields(panelRef.current) === baseline.current;
    if (confirmClose && !unchanged) setConfirming(true);
    else onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-lc-accent-ink/50 backdrop-blur-[2px] sm:items-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div ref={panelRef} className="lc-scroll max-h-[90svh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-card border-2 border-lc-border bg-lc-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-soft sm:rounded-card sm:animate-pop-in">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={requestClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lc-muted transition-colors hover:bg-lc-border/40 hover:text-lc-text"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>
        {children}
      </div>

      {confirming && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-lc-accent-ink/40 p-4"
          role="alertdialog"
          aria-labelledby="modal-confirm-title"
        >
          <div className="w-full max-w-sm animate-pop-in rounded-card border-2 border-lc-border bg-lc-card p-5 shadow-soft">
            <p id="modal-confirm-title" className="font-display text-base font-semibold">
              Sei sicuro di chiudere?
            </p>
            <p className="mt-1 text-sm text-lc-muted">Perderai tutti i progressi fatti.</p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <SecondaryButton type="button" autoFocus onClick={() => setConfirming(false)}>
                Continua a modificare
              </SecondaryButton>
              <DangerButton
                type="button"
                onClick={() => {
                  setConfirming(false);
                  onClose();
                }}
              >
                Sì, chiudi
              </DangerButton>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
