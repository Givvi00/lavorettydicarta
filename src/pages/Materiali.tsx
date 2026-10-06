import { useState } from 'react';
import { useStore } from '@/store/useStore';
import {
  Card,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  Modal,
  Field,
  Input,
  Textarea,
  Badge,
  EmptyState,
} from '@/components/ui/primitives';
import { Boxes, ImagePlus, X, ExternalLink, Package2 } from 'lucide-react';
import { formatEUR } from '@/utils/calc';
import { fileToCompressedDataUrl } from '@/utils/image';
import type { Material } from '@/types';

export function Materiali() {
  const { materials, upsertMaterial, deleteMaterial } = useStore();
  const [editing, setEditing] = useState<Material | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = materials.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex animate-slide-up flex-col gap-4 p-4 md:gap-5 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold md:text-2xl">Materiali</h1>
        <PrimaryButton onClick={() => setCreating(true)}>+ Nuovo</PrimaryButton>
      </div>

      <Input
        className="md:max-w-xs"
        placeholder="Cerca materiale..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 && (
          <EmptyState icon={<Boxes />} text="Il magazzino è vuoto: aggiungi il primo materiale." />
        )}
        {filtered.map((m) => {
          const low = m.minStock != null && m.stockQty <= m.minStock;
          return (
            <Card key={m.id} className="flex items-center gap-3">
              <div onClick={() => setEditing(m)} className="flex flex-1 cursor-pointer items-center gap-3 text-left">
                {m.photo ? (
                  <img src={m.photo} alt="" className="h-11 w-11 shrink-0 rounded-btn object-cover" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-lc-accent/20 text-lc-olive">
                    <Boxes size={18} />
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{m.name}</p>
                    {low && <Badge tone="danger">scorta bassa</Badge>}
                  </div>
                  <p className="text-sm text-lc-muted">
                    {m.stockQty} {m.unit} disponibili · {formatEUR(m.unitCost)}/{m.unit}
                    {m.supplier ? ` · ${m.supplier}` : ''}
                  </p>
                  {m.packageQty && m.packagePrice ? (
                    <p className="text-xs text-lc-muted">
                      Confezione: {m.packageQty} {m.unit} · {formatEUR(m.packagePrice)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {m.purchaseUrl && (
                  <a
                    href={m.purchaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Apri link acquisto"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-lc-accent/20 text-lc-olive transition-transform active:scale-90"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
                <SecondaryButton onClick={() => setEditing(m)}>Modifica</SecondaryButton>
              </div>
            </Card>
          );
        })}
      </div>

      {creating && (
        <MaterialForm
          open={creating}
          onClose={() => setCreating(false)}
          onSave={async (data) => {
            await upsertMaterial(data);
            setCreating(false);
          }}
        />
      )}

      {editing && (
        <MaterialForm
          open={!!editing}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            await upsertMaterial({ ...data, id: editing.id });
            setEditing(null);
          }}
          onDelete={async () => {
            await deleteMaterial(editing.id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function MaterialForm({
  open,
  onClose,
  onSave,
  onDelete,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Material>) => void;
  onDelete?: () => void;
  initial?: Material;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? 'pz');
  const [unitCost, setUnitCost] = useState(initial?.unitCost ?? 0);
  const [supplier, setSupplier] = useState(initial?.supplier ?? '');
  const [stockQty, setStockQty] = useState(initial?.stockQty ?? 0);
  const [minStock, setMinStock] = useState(initial?.minStock ?? 0);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [packageQty, setPackageQty] = useState(initial?.packageQty ?? 0);
  const [packagePrice, setPackagePrice] = useState(initial?.packagePrice ?? 0);
  const [purchaseUrl, setPurchaseUrl] = useState(initial?.purchaseUrl ?? '');
  const [photo, setPhoto] = useState(initial?.photo ?? '');
  const [photoBusy, setPhotoBusy] = useState(false);

  const costPerUnitFromPackage = packageQty > 0 && packagePrice > 0 ? packagePrice / packageQty : null;

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    try {
      setPhoto(await fileToCompressedDataUrl(file));
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifica materiale' : 'Nuovo materiale'}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onSave({
            name: name.trim(),
            unit,
            unitCost,
            supplier,
            stockQty,
            minStock,
            notes,
            packageQty: packageQty || undefined,
            packagePrice: packagePrice || undefined,
            purchaseUrl,
            photo,
          });
        }}
      >
        <Field label="Foto">
          <div className="flex items-center gap-3">
            {photo ? (
              <div className="relative">
                <img src={photo} alt="" className="h-16 w-16 rounded-btn object-cover" />
                <button
                  type="button"
                  onClick={() => setPhoto('')}
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
            <label>
              <span className="inline-block cursor-pointer rounded-btn border-2 border-lc-border bg-lc-surface px-3 py-2 text-sm font-semibold text-lc-text">
                {photoBusy ? 'Carico...' : photo ? 'Cambia foto' : 'Scegli foto'}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
          </div>
        </Field>

        <Field label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unità di misura">
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pz, foglio, metro..." />
          </Field>
          <Field label="Costo per unità (€)">
            <Input
              type="number"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
            />
          </Field>
        </div>

        <Card className="flex flex-col gap-2 bg-lc-bg">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-lc-muted">
            <Package2 size={15} /> Confezione d'acquisto (opzionale)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${unit || 'Pezzi'} per confezione`}>
              <Input
                type="number"
                step="1"
                value={packageQty}
                onChange={(e) => setPackageQty(parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="Prezzo confezione (€)">
              <Input
                type="number"
                step="0.01"
                value={packagePrice}
                onChange={(e) => setPackagePrice(parseFloat(e.target.value) || 0)}
              />
            </Field>
          </div>
          {costPerUnitFromPackage != null && (
            <p className="text-sm text-lc-muted">
              Costo per {unit || 'unità'}: <strong>{formatEUR(costPerUnitFromPackage)}</strong>{' '}
              <button
                type="button"
                onClick={() => setUnitCost(Math.round(costPerUnitFromPackage * 10000) / 10000)}
                className="font-semibold text-lc-olive underline"
              >
                usa questo costo
              </button>
            </p>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantità in magazzino">
            <Input
              type="number"
              step="0.01"
              value={stockQty}
              onChange={(e) => setStockQty(parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="Scorta minima (avviso)">
            <Input
              type="number"
              step="0.01"
              value={minStock}
              onChange={(e) => setMinStock(parseFloat(e.target.value) || 0)}
            />
          </Field>
        </div>
        <Field label="Fornitore">
          <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </Field>
        <Field label="Link acquisto (es. Amazon, Cricut store...)">
          <Input
            type="url"
            value={purchaseUrl}
            onChange={(e) => setPurchaseUrl(e.target.value)}
            placeholder="https://..."
          />
        </Field>
        <Field label="Note">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>
        <div className="mt-2 flex items-center justify-between">
          {onDelete ? <DangerButton type="button" onClick={onDelete}>Elimina</DangerButton> : <span />}
          <PrimaryButton type="submit">Salva</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
