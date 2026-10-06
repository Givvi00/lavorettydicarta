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
  Select,
  Badge,
  EmptyState,
} from '@/components/ui/primitives';
import { Package } from 'lucide-react';
import { formatEUR, totalCostOf, marginOf } from '@/utils/calc';
import type { BomLine, Product, ProductType } from '@/types';

export function Prodotti() {
  const { products, materials, upsertProduct, deleteProduct } = useStore();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex animate-slide-up flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">Prodotti</h1>
        <PrimaryButton onClick={() => setCreating(true)}>+ Nuovo</PrimaryButton>
      </div>

      <Input placeholder="Cerca prodotto..." value={query} onChange={(e) => setQuery(e.target.value)} />

      <div className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <EmptyState icon={<Package />} text="Nessun prodotto ancora: crea il primo del tuo catalogo." />
        )}
        {filtered.map((p) => {
          const cost = totalCostOf(p, materials);
          const margin = marginOf(p, materials);
          return (
            <Card key={p.id} className="flex items-center justify-between">
              <div onClick={() => setEditing(p)} className="flex-1 cursor-pointer text-left">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{p.name}</p>
                  <Badge tone={p.type === 'pronto' ? 'default' : 'accent'}>
                    {p.type === 'pronto' ? 'pronto' : 'personalizzabile'}
                  </Badge>
                  {!p.active && <Badge tone="danger">disattivato</Badge>}
                </div>
                <p className="text-sm text-lc-muted">
                  Vendita {formatEUR(p.salePrice)} · Costo {formatEUR(cost)} · Margine{' '}
                  <span className={margin >= 0 ? 'text-lc-success' : 'text-lc-danger'}>
                    {formatEUR(margin)}
                  </span>
                </p>
              </div>
              <SecondaryButton onClick={() => setEditing(p)}>Modifica</SecondaryButton>
            </Card>
          );
        })}
      </div>

      <ProductForm
        open={creating}
        materials={materials}
        onClose={() => setCreating(false)}
        onSave={async (data) => {
          await upsertProduct(data);
          setCreating(false);
        }}
      />

      {editing && (
        <ProductForm
          open={!!editing}
          initial={editing}
          materials={materials}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            await upsertProduct({ ...data, id: editing.id });
            setEditing(null);
          }}
          onDelete={async () => {
            await deleteProduct(editing.id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ProductForm({
  open,
  onClose,
  onSave,
  onDelete,
  initial,
  materials,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Product>) => void;
  onDelete?: () => void;
  initial?: Product;
  materials: ReturnType<typeof useStore.getState>['materials'];
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [type, setType] = useState<ProductType>(initial?.type ?? 'personalizzabile');
  const [salePrice, setSalePrice] = useState(initial?.salePrice ?? 0);
  const [laborCost, setLaborCost] = useState(initial?.laborCost ?? 0);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [bom, setBom] = useState<BomLine[]>(initial?.bom ?? []);

  const materialCost = bom.reduce((sum, line) => {
    const mat = materials.find((m) => m.id === line.materialId);
    return sum + (mat ? mat.unitCost * line.quantity : 0);
  }, 0);
  const totalCost = materialCost + (laborCost || 0);
  const margin = salePrice - totalCost;
  const marginPct = salePrice > 0 ? (margin / salePrice) * 100 : 0;

  function addBomLine() {
    if (materials.length === 0) return;
    setBom([...bom, { materialId: materials[0].id, quantity: 1 }]);
  }

  function updateBomLine(index: number, patch: Partial<BomLine>) {
    setBom(bom.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function removeBomLine(index: number) {
    setBom(bom.filter((_, i) => i !== index));
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifica prodotto' : 'Nuovo prodotto'}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onSave({ name: name.trim(), category, type, salePrice, laborCost, description, active, bom });
        }}
      >
        <Field label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Shadowbox, Biglietti..." />
          </Field>
          <Field label="Tipo">
            <Select value={type} onChange={(e) => setType(e.target.value as ProductType)}>
              <option value="pronto">Pronto</option>
              <option value="personalizzabile">Personalizzabile</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prezzo di vendita (€)">
            <Input
              type="number"
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="Costo manodopera (€)">
            <Input
              type="number"
              step="0.01"
              value={laborCost}
              onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
            />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-lc-muted">Distinta base (materiali)</span>
            <SecondaryButton type="button" onClick={addBomLine} disabled={materials.length === 0}>
              + Materiale
            </SecondaryButton>
          </div>
          {materials.length === 0 && (
            <p className="text-sm text-lc-muted">Aggiungi prima dei materiali in magazzino.</p>
          )}
          <div className="flex flex-col gap-2">
            {bom.map((line, i) => {
              const mat = materials.find((m) => m.id === line.materialId);
              return (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    className="flex-1"
                    value={line.materialId}
                    onChange={(e) => updateBomLine(i, { materialId: e.target.value })}
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    className="w-24"
                    value={line.quantity}
                    onChange={(e) => updateBomLine(i, { quantity: parseFloat(e.target.value) || 0 })}
                  />
                  <span className="w-10 shrink-0 text-xs text-lc-muted">{mat?.unit}</span>
                  <button
                    type="button"
                    onClick={() => removeBomLine(i)}
                    className="text-lc-danger"
                    aria-label="Rimuovi"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <Card className="flex flex-col gap-1 bg-lc-bg">
          <div className="flex justify-between text-sm">
            <span className="text-lc-muted">Costo materiali</span>
            <span>{formatEUR(materialCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-lc-muted">Costo totale (materiali + manodopera)</span>
            <span>{formatEUR(totalCost)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Margine</span>
            <span className={margin >= 0 ? 'text-lc-success' : 'text-lc-danger'}>
              {formatEUR(margin)} ({marginPct.toFixed(0)}%)
            </span>
          </div>
        </Card>

        <Field label="Descrizione">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Prodotto attivo
        </label>

        <div className="mt-2 flex items-center justify-between">
          {onDelete ? <DangerButton type="button" onClick={onDelete}>Elimina</DangerButton> : <span />}
          <PrimaryButton type="submit">Salva</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
