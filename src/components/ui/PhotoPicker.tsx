import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus, X } from 'lucide-react';
import { fileToCompressedDataUrl } from '@/utils/image';

/** Foto a schermo intero: si chiude toccando ovunque o con la X */
export function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <img src={src} alt="" className="max-h-full max-w-full rounded-card object-contain shadow-lift" />
      <button
        type="button"
        aria-label="Chiudi foto"
        className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black"
      >
        <X size={20} />
      </button>
    </div>,
    document.body
  );
}

export function PhotoPicker({
  label = 'Foto',
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [askRemove, setAskRemove] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      onChange(await fileToCompressedDataUrl(file));
    } finally {
      setBusy(false);
    }
  }

  return (
    // Non un <label>: un'etichetta che copre tutta la riga fa partire la fotocamera con un tocco qualsiasi
    <div className="flex flex-col gap-1 text-left">
      <span className="text-sm font-semibold text-lc-muted">{label}</span>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative">
            <button type="button" onClick={() => setZoom(true)} aria-label="Ingrandisci foto">
              <img src={value} alt="" className="h-16 w-16 cursor-zoom-in rounded-btn object-cover" />
            </button>
            <button
              type="button"
              onClick={() => setAskRemove(true)}
              aria-label="Rimuovi foto"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-lc-danger text-white shadow-soft"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-btn border-2 border-dashed border-lc-border text-lc-muted">
            <ImagePlus size={20} />
          </span>
        )}
        {askRemove ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Rimuovere la foto?</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setAskRemove(false);
                }}
                className="rounded-btn bg-lc-danger px-3 py-2 text-sm font-semibold text-white"
              >
                Sì, rimuovi
              </button>
              <button
                type="button"
                onClick={() => setAskRemove(false)}
                className="rounded-btn border-2 border-lc-border bg-lc-surface px-3 py-2 text-sm font-semibold text-lc-text"
              >
                Annulla
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 sm:flex-row">
            <label>
              <span className="inline-block cursor-pointer rounded-btn border-2 border-lc-border bg-lc-surface px-3 py-2 text-sm font-semibold text-lc-text">
                {busy ? 'Carico...' : 'Scatta foto'}
              </span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            </label>
            <label>
              <span className="inline-block cursor-pointer rounded-btn border-2 border-lc-border bg-lc-surface px-3 py-2 text-sm font-semibold text-lc-text">
                Libreria
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          </div>
        )}
      </div>
      {zoom && value && <Lightbox src={value} onClose={() => setZoom(false)} />}
    </div>
  );
}
