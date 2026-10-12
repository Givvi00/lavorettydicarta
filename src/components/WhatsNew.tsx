import { createPortal } from 'react-dom';
import { Sparkles } from 'lucide-react';
import { APP_VERSION, type ChangelogEntry } from '@/data/changelog';
import { PrimaryButton } from '@/components/ui/primitives';

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

/** Elenco delle versioni (la più recente in alto): usato dal popup dopo un aggiornamento e da Impostazioni */
export function ChangelogSheet({
  entries,
  title,
  onClose,
}: {
  entries: readonly ChangelogEntry[];
  title: string;
  onClose: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="lc-scroll max-h-[85dvh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-card border-2 border-lc-border bg-lc-surface px-5 pt-5 text-left shadow-lift md:rounded-card"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="lc-sticker flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lc-accent text-lc-accent-text">
            <Sparkles size={22} />
          </span>
          <div>
            <h3 className="font-display text-xl font-semibold leading-tight">{title}</h3>
            <p className="text-xs font-semibold text-lc-muted">Versione {APP_VERSION}</p>
          </div>
        </div>

        {entries.map((entry, i) => (
          <section key={entry.version} className="mt-5">
            {(entries.length > 1 || i > 0) && (
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-lc-muted">
                Versione {entry.version} · {longDate(entry.date)}
              </p>
            )}
            <ul className="flex flex-col gap-3">
              {entry.items.map((text) => (
                <li key={text} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-lc-accent" />
                  <span className="text-sm leading-6">{text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <PrimaryButton type="button" onClick={onClose} className="mt-6 w-full">
          Ho capito
        </PrimaryButton>
      </div>
    </div>,
    document.body
  );
}
