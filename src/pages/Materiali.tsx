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
import { Boxes } from 'lucide-react';
import { formatEUR } from '@/utils/calc';
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
            <Card key={m.id} className="flex items-center justify-between">
              <div onClick={() => setEditing(m)} className="flex-1 cursor-pointer text-left">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{m.name}</p>
                  {low && <Badge tone="danger">scorta bassa</Badge>}
                </div>
                <p className="text-sm text-lc-muted">
                  {m.stockQty} {m.unit} disponibili · {formatEUR(m.unitCost)}/{m.unit}
                  {m.supplier ? ` · ${m.supplier}` : ''}
                </p>
              </div>
              <SecondaryButton onClick={() => setEditing(m)}>Modifica</SecondaryButton>
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

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifica materiale' : 'Nuovo materiale'}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onSave({ name: name.trim(), unit, unitCost, supplier, stockQty, minStock, notes });
        }}
      >
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
