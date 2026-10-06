import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { fileToCompressedDataUrl } from '@/utils/image';
import { Field } from '@/components/ui/primitives';

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
    <Field label={label}>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative">
            <img src={value} alt="" className="h-16 w-16 rounded-btn object-cover" />
            <button
              type="button"
              onClick={() => onChange('')}
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
      </div>
    </Field>
  );
}
