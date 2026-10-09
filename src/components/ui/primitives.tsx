import { useState } from 'react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-lc-border bg-lc-card p-4 shadow-card ${className}`}>
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
      className={`rounded-blob bg-lc-accent px-5 py-2.5 font-display font-semibold text-lc-accent-text shadow-press transition-transform active:shadow-press-down active:translate-y-[3px] disabled:opacity-50 disabled:active:translate-y-0 ${className}`}
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
      className={`rounded-blob border-2 border-lc-border bg-lc-surface px-5 py-2.5 font-display font-semibold text-lc-text transition-transform active:translate-y-0.5 disabled:opacity-50 ${className}`}
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
      className={`rounded-blob bg-lc-danger px-5 py-2.5 font-display font-semibold text-white transition-transform active:translate-y-0.5 disabled:opacity-50 ${className}`}
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
      className={`rounded-btn border-2 border-lc-border bg-lc-surface px-3 py-2 text-lc-text outline-none transition-colors focus:border-lc-accent ${props.className ?? ''}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`rounded-btn border-2 border-lc-border bg-lc-surface px-3 py-2 text-lc-text outline-none transition-colors focus:border-lc-accent ${props.className ?? ''}`}
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
      className={`rounded-btn border-2 border-lc-border bg-lc-surface px-3 py-2 text-lc-text outline-none transition-colors focus:border-lc-accent ${className}`}
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

// Si esce solo con la ✕ (mai cliccando fuori, per non perdere per sbaglio quello che si sta compilando).
// Con confirmClose (default) la ✕ chiede prima conferma; il contenuto resta montato sotto, quindi
// scegliendo "Continua" non si perde nulla. Passa confirmClose={false} dove non c'è nulla da perdere.
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
  if (!open) return null;

  function requestClose() {
    if (confirmClose) setConfirming(true);
    else onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-lc-accent-ink/50 backdrop-blur-[2px] sm:items-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-h-[90svh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-card border-2 border-lc-border bg-lc-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-soft sm:rounded-card sm:animate-pop-in">
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
