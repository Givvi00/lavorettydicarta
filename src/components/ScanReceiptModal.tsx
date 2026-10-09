import { useState } from 'react';
import { Loader2, Receipt, X, PlusCircle, Search } from 'lucide-react';
import { Modal, Field, Input, PrimaryButton, SecondaryButton, Select, Badge } from '@/components/ui/primitives';
import { useStore } from '@/store/useStore';
import { MaterialForm } from '@/pages/Materiali';
import { readReceipt, type ReceiptLine } from '@/services/receiptOcr';
import { bestMatch } from '@/utils/similarity';
import type { Material } from '@/types';

type Confidence = 'high' | 'medium' | 'low';

interface ReviewRow {
  line: ReceiptLine;
  confidence: Confidence;
  action: 'update' | 'created' | 'skip';
  materialId: string; // per 'update'/'created'
  quantity: number;
}

const HIGH_THRESHOLD = 0.5;
const LOW_THRESHOLD = 0.2;

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'Corrispondenza trovata',
  medium: 'Forse corrisponde, verifica',
  low: 'Nessuna corrispondenza',
};
const CONFIDENCE_TONE: Record<Confidence, 'success' | 'accent' | 'danger'> = {
  high: 'success',
  medium: 'accent',
  low: 'danger',
};
const CONFIDENCE_CARD: Record<Confidence, string> = {
  high: 'border-lc-success/40 bg-lc-success/5',
  medium: 'border-lc-accent/60 bg-lc-accent/5',
  low: 'border-lc-danger/40 bg-lc-danger/5',
};

export function ScanReceiptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { materials, upsertMaterial } = useStore();
  const [step, setStep] = useState<'pick' | 'loading' | 'review' | 'error'>('pick');
  const [error, setError] = useState('');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [supplier, setSupplier] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [creatingForRow, setCreatingForRow] = useState<number | null>(null);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setStep('loading');
    try {
      const { supplier: detectedSupplier, lines } = await readReceipt(file);
      setSupplier(detectedSupplier);
      if (lines.length === 0) {
        setError('Non ho trovato nessun articolo leggibile su questo scontrino.');
        setStep('error');
        return;
      }
      setRows(
        lines.map((line) => {
          const match = bestMatch(line.name, materials, (m) => m.name, 0);
          const confidence: Confidence =
            match && match.score >= HIGH_THRESHOLD ? 'high' : match && match.score >= LOW_THRESHOLD ? 'medium' : 'low';
          return {
            line,
            confidence,
            action: confidence === 'low' ? 'skip' : 'update',
            materialId: confidence !== 'low' ? (match?.item.id ?? '') : '',
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
        if (row.action !== 'update' || !row.materialId) continue;
        const existing = materials.find((m) => m.id === row.materialId);
        if (!existing) continue;
        await upsertMaterial({ id: existing.id, stockQty: existing.stockQty + row.quantity });
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
    setSupplier(undefined);
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
      confirmClose={step === 'review' || step === 'loading'}
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
            <Badge tone="success">verde</Badge> trovato automaticamente ·{' '}
            <Badge tone="accent">arancione</Badge> verifica tu ·{' '}
            <Badge tone="danger">rosso</Badge> nessuna corrispondenza (es. un frullatore)
          </p>
          <div className="flex flex-col gap-3">
            {rows.map((row, i) => {
              const matchedMaterial = materials.find((m) => m.id === row.materialId);
              return (
                <div key={i} className={`flex flex-col gap-2 rounded-btn border p-2 ${CONFIDENCE_CARD[row.confidence]}`}>
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={CONFIDENCE_TONE[row.confidence]}>{CONFIDENCE_LABEL[row.confidence]}</Badge>
                    <button
                      type="button"
                      onClick={() => updateRow(i, { action: 'skip', materialId: '' })}
                      className="text-lc-muted hover:text-lc-danger"
                      aria-label="Ignora riga"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <p className="text-xs text-lc-muted">
                    Scontrino: <span className="italic">"{row.line.rawText}"</span>
                    {row.line.brand ? ` · ${row.line.brand}` : ''}
                  </p>

                  {row.action === 'created' ? (
                    <p className="text-sm font-semibold text-lc-success">
                      ✓ Creato: {matchedMaterial?.name ?? row.line.name} (+{row.quantity})
                    </p>
                  ) : row.action === 'skip' ? (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-lc-muted">Ignorata.</p>
                      <SecondaryButton
                        type="button"
                        className="px-2 py-1 text-xs"
                        onClick={() => updateRow(i, { action: 'update' })}
                      >
                        Annulla
                      </SecondaryButton>
                    </div>
                  ) : (
                    <>
                      <Field label="Associa a materiale esistente">
                        <div className="flex items-center gap-1.5">
                          <Search size={14} className="shrink-0 text-lc-muted" />
                          <Select
                            className="flex-1"
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
                        </div>
                      </Field>
                      <Field label="Quantità">
                        <Input
                          type="number"
                          step="1"
                          value={row.quantity}
                          onChange={(e) => updateRow(i, { quantity: parseFloat(e.target.value) || 0 })}
                          className="w-24"
                        />
                      </Field>
                      <SecondaryButton type="button" className="text-xs" onClick={() => setCreatingForRow(i)}>
                        <PlusCircle size={14} className="mr-1 inline -mt-0.5" /> Crea nuovo materiale
                      </SecondaryButton>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-end">
            <PrimaryButton type="button" onClick={confirmAll} disabled={saving}>
              {saving ? 'Salvo...' : 'Conferma e salva'}
            </PrimaryButton>
          </div>

          {creatingForRow != null && (
            <MaterialForm
              open={true}
              initial={{
                name: rows[creatingForRow].line.name,
                unit: 'pz',
                unitCost: rows[creatingForRow].line.unitPrice ?? 0,
                stockQty: rows[creatingForRow].quantity,
                supplier,
                notes: rows[creatingForRow].line.brand ? `Marca: ${rows[creatingForRow].line.brand}` : undefined,
              }}
              onClose={() => setCreatingForRow(null)}
              onSave={async (data) => {
                const created = await upsertMaterial(data);
                updateRow(creatingForRow, { action: 'created', materialId: created.id });
                setCreatingForRow(null);
              }}
            />
          )}
        </div>
      )}
    </Modal>
  );
}
