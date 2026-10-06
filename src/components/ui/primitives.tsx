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

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-lc-accent-ink/50 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90svh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-card border-2 border-lc-border bg-lc-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-soft sm:rounded-card sm:animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lc-muted transition-colors hover:bg-lc-border/40 hover:text-lc-text"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
