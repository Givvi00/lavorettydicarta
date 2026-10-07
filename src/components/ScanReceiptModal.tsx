import { useState } from 'react';
import { Loader2, Receipt, Check, X, PlusCircle } from 'lucide-react';
import { Modal, Field, Input, PrimaryButton, SecondaryButton, Select } from '@/components/ui/primitives';
import { useStore } from '@/store/useStore';
import { readReceipt, type ReceiptLine } from '@/services/receiptOcr';
import { bestMatch } from '@/utils/similarity';
import type { Material } from '@/types';

interface ReviewRow {
  line: ReceiptLine;
  action: 'update' | 'create' | 'skip';
  materialId: string; // per 'update'
  newName: string; // per 'create'
  quantity: number;
}

export function ScanReceiptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { materials, upsertMaterial } = useStore();
  const [step, setStep] = useState<'pick' | 'loading' | 'review' | 'error'>('pick');
  const [error, setError] = useState('');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [saving, setSaving] = useState(false);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setStep('loading');
    try {
      const lines = await readReceipt(file);
      if (lines.length === 0) {
        setError('Non ho trovato nessun articolo leggibile su questo scontrino.');
        setStep('error');
        return;
      }
      setRows(
        lines.map((line) => {
          const match = bestMatch(line.name, materials, (m) => m.name);
          return {
            line,
            action: match ? 'update' : 'create',
            materialId: match?.item.id ?? '',
            newName: line.name,
            quantity: line.quantity,
          };
        })
      );
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto, riprova.');
      setStep('error');
    }
  }

  function updateRow(index: number, patch: Partial<ReviewRow>) {
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function confirmAll() {
    setSaving(true);
    try {
      for (const row of rows) {
        if (row.action === 'skip') continue;
        if (row.action === 'update' && row.materialId) {
          const existing = materials.find((m) => m.id === row.materialId);
          if (!existing) continue;
          await upsertMaterial({ id: existing.id, stockQty: existing.stockQty + row.quantity });
        } else if (row.action === 'create') {
          await upsertMaterial({
            name: row.newName.trim() || row.line.name,
            unit: 'pz',
            unitCost: row.line.unitPrice ?? 0,
            stockQty: row.quantity,
          });
        }
      }
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStep('pick');
    setRows([]);
    setError('');
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Scansiona scontrino"
    >
      {step === 'pick' && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <Receipt size={40} className="text-lc-muted" />
          <p className="text-sm text-lc-muted">
            Fotografa lo scontrino: leggo gli articoli e aggiorno in automatico le giacenze dei materiali
            già presenti.
          </p>
          <label>
            <span className="inline-block cursor-pointer rounded-blob bg-lc-accent px-5 py-2.5 font-display font-semibold text-lc-accent-text shadow-press">
              Scatta foto scontrino
            </span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          </label>
        </div>
      )}

      {step === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 size={32} className="animate-spin text-lc-accent" />
          <p className="text-sm text-lc-muted">Leggo lo scontrino... può richiedere qualche secondo.</p>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <p className="text-sm text-lc-danger">{error}</p>
          <SecondaryButton onClick={reset}>Riprova</SecondaryButton>
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-lc-muted">
            Controlla gli abbinamenti prima di salvare. Puoi cambiare materiale, creare un nuovo
            articolo o escludere una riga.
          </p>
          <div className="flex flex-col gap-3">
            {rows.map((row, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-btn border border-lc-border p-2">
                <p className="text-xs text-lc-muted">
                  Scontrino: <span className="italic">"{row.line.rawText}"</span>
                </p>

                <div className="flex gap-2">
                  <SecondaryButton
                    type="button"
                    className={`flex-1 px-2 py-1.5 text-xs ${row.action === 'update' ? 'border-lc-accent' : ''}`}
                    onClick={() => updateRow(i, { action: 'update' })}
                  >
                    <Check size={14} className="mr-1 inline -mt-0.5" /> Aggiorna esistente
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    className={`flex-1 px-2 py-1.5 text-xs ${row.action === 'create' ? 'border-lc-accent' : ''}`}
                    onClick={() => updateRow(i, { action: 'create' })}
                  >
                    <PlusCircle size={14} className="mr-1 inline -mt-0.5" /> Crea nuovo
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    className={`px-2 py-1.5 text-xs ${row.action === 'skip' ? 'border-lc-danger' : ''}`}
                    onClick={() => updateRow(i, { action: 'skip' })}
                  >
                    <X size={14} />
                  </SecondaryButton>
                </div>

                {row.action === 'update' && (
                  <Select
                    value={row.materialId}
                    onChange={(e) => updateRow(i, { materialId: e.target.value })}
                  >
                    <option value="">Scegli materiale...</option>
                    {materials.map((m: Material) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                )}
                {row.action === 'create' && (
                  <Input
                    value={row.newName}
                    onChange={(e) => updateRow(i, { newName: e.target.value })}
                    placeholder="Nome nuovo materiale"
                  />
                )}
                {row.action !== 'skip' && (
                  <Field label="Quantità">
                    <Input
                      type="number"
                      step="1"
                      value={row.quantity}
                      onChange={(e) => updateRow(i, { quantity: parseFloat(e.target.value) || 0 })}
                      className="w-24"
                    />
                  </Field>
                )}
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <SecondaryButton type="button" onClick={reset}>
              Annulla
            </SecondaryButton>
            <PrimaryButton type="button" onClick={confirmAll} disabled={saving}>
              {saving ? 'Salvo...' : 'Conferma e salva'}
            </PrimaryButton>
          </div>
        </div>
      )}
    </Modal>
  );
}
