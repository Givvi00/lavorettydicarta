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
import { Package, Tags, Trash2, Clock, Sparkles } from 'lucide-react';
import { PhotoPicker } from '@/components/ui/PhotoPicker';
import { CreateProductByVoiceModal } from '@/components/CreateProductByVoiceModal';
import { useSettings } from '@/hooks/useSettings';
import { formatEUR, totalCostOf, marginOf, effectiveUnitCost } from '@/utils/calc';
import type { BomLine, Category, Product, ProductType } from '@/types';

const NEW_CATEGORY = '__new__';

export function Prodotti() {
  const { products, materials, categories, upsertProduct, deleteProduct, upsertCategory, deleteCategory } =
    useStore();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [managingCategories, setManagingCategories] = useState(false);
  const [creatingByVoice, setCreatingByVoice] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) &&
      (!categoryFilter || p.category === categoryFilter)
  );

  return (
    <div className="flex animate-slide-up flex-col gap-4 p-4 md:gap-5 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold md:text-3xl"><span className="lc-marker">Prodotti</span></h1>
        <div className="flex gap-2">
          <SecondaryButton onClick={() => setManagingCategories(true)}>
            <Tags size={16} className="mr-1 inline -mt-0.5" /> Categorie
          </SecondaryButton>
          <SecondaryButton
            onClick={() => setCreatingByVoice(true)}
            className="lc-ai-gradient border-transparent text-lc-accent-text"
          >
            <Sparkles size={16} className="mr-1 inline -mt-0.5" /> Racconta
          </SecondaryButton>
          <PrimaryButton data-tour="btn-nuovo" onClick={() => setCreating(true)}>+ Nuovo</PrimaryButton>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          className="sm:max-w-xs"
          placeholder="Cerca prodotto..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          className="sm:max-w-xs"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Tutte le categorie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 && (
          <EmptyState icon={<Package />} text="Nessun prodotto ancora: crea il primo del tuo catalogo." />
        )}
        {filtered.map((p) => {
          const cost = totalCostOf(p, materials);
          const margin = marginOf(p, materials);
          return (
            <Card key={p.id} lift className="flex items-center gap-3">
              <div onClick={() => setEditing(p)} className="flex flex-1 cursor-pointer items-center gap-3 text-left">
                {p.photo ? (
                  <img src={p.photo} alt="" className="h-11 w-11 shrink-0 rounded-btn object-cover" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-lc-accent/20 text-lc-olive">
                    <Package size={18} />
                  </span>
                )}
                <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-semibold">{p.name}</p>
                  {p.category && <Badge tone="pink">{p.category}</Badge>}
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
              </div>
              <SecondaryButton onClick={() => setEditing(p)}>Modifica</SecondaryButton>
            </Card>
          );
        })}
      </div>

      {creating && (
        <ProductForm
          open={creating}
          materials={materials}
          categories={categories}
          onAddCategory={(name) => upsertCategory({ name })}
          onClose={() => setCreating(false)}
          onSave={async (data) => {
            await upsertProduct(data);
            setCreating(false);
          }}
        />
      )}

      {editing && (
        <ProductForm
          open={!!editing}
          initial={editing}
          materials={materials}
          categories={categories}
          onAddCategory={(name) => upsertCategory({ name })}
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

      {creatingByVoice && (
        <CreateProductByVoiceModal open={creatingByVoice} onClose={() => setCreatingByVoice(false)} />
      )}

      {managingCategories && (
        <CategoriesModal
          open={managingCategories}
          categories={categories}
          productCountFor={(name) => products.filter((p) => p.category === name).length}
          onAdd={(name) => upsertCategory({ name })}
          onRename={(id, name) => upsertCategory({ id, name })}
          onDelete={(id) => deleteCategory(id)}
          onClose={() => setManagingCategories(false)}
        />
      )}
    </div>
  );
}

function CategoriesModal({
  open,
  categories,
  productCountFor,
  onAdd,
  onRename,
  onDelete,
  onClose,
}: {
  open: boolean;
  categories: Category[];
  productCountFor: (name: string) => number;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState('');

  return (
    <Modal open={open} onClose={onClose} title="Categorie prodotti" confirmClose={false}>
      <div className="flex flex-col gap-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newName.trim();
            if (!name) return;
            onAdd(name);
            setNewName('');
          }}
        >
          <Input
            className="flex-1"
            placeholder="Nuova categoria (es. Shadowbox)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <PrimaryButton type="submit">Aggiungi</PrimaryButton>
        </form>

        {categories.length === 0 ? (
          <p className="text-sm text-lc-muted">Nessuna categoria ancora: aggiungine una qui sopra.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  defaultValue={c.name}
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (name && name !== c.name) onRename(c.id, name);
                    else e.target.value = c.name;
                  }}
                />
                <span className="w-14 shrink-0 text-xs text-lc-muted">
                  {productCountFor(c.name)} prod.
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(c.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lc-danger transition-colors hover:bg-lc-danger/10"
                  aria-label="Elimina categoria"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end">
          <SecondaryButton type="button" onClick={onClose}>
            Fatto
          </SecondaryButton>
        </div>
      </div>
    </Modal>
  );
}

function ProductForm({
  open,
  onClose,
  onSave,
  onDelete,
  initial,
  materials,
  categories,
  onAddCategory,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Product>) => void;
  onDelete?: () => void;
  initial?: Product;
  materials: ReturnType<typeof useStore.getState>['materials'];
  categories: Category[];
  onAddCategory: (name: string) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [type, setType] = useState<ProductType>(initial?.type ?? 'personalizzabile');
  const [salePrice, setSalePrice] = useState(initial?.salePrice ?? 0);
  const [laborCost, setLaborCost] = useState(initial?.laborCost ?? 0);
  const [productionHours, setProductionHours] = useState(initial?.productionHours ?? 0);
  const [designHours, setDesignHours] = useState(initial?.designHours ?? 0);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [bom, setBom] = useState<BomLine[]>(initial?.bom ?? []);
  const [photo, setPhoto] = useState(initial?.photo ?? '');
  const { rates } = useSettings();

  const materialCost = bom.reduce((sum, line) => {
    const mat = materials.find((m) => m.id === line.materialId);
    return sum + (mat ? effectiveUnitCost(mat) * line.quantity : 0);
  }, 0);
  const totalCost = materialCost + (laborCost || 0);
  const margin = salePrice - totalCost;
  const marginPct = salePrice > 0 ? (margin / salePrice) * 100 : 0;
  const productionCostFromHours = productionHours > 0 ? productionHours * rates.productionRate : null;
  const designCostOneTime = designHours > 0 ? designHours * rates.designRate : null;

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

  function confirmNewCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      setAddingCategory(false);
      return;
    }
    onAddCategory(name);
    setCategory(name);
    setNewCategoryName('');
    setAddingCategory(false);
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifica prodotto' : 'Nuovo prodotto'}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onSave({
            name: name.trim(),
            category,
            type,
            salePrice,
            laborCost,
            productionHours: productionHours || undefined,
            designHours: designHours || undefined,
            description,
            active,
            bom,
            photo,
          });
        }}
      >
        <PhotoPicker value={photo} onChange={setPhoto} />

        <Field label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            {addingCategory ? (
              <div className="flex gap-1.5">
                <Input
                  className="flex-1"
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      confirmNewCategory();
                    }
                  }}
                  placeholder="Nome categoria"
                />
                <SecondaryButton type="button" className="px-3" onClick={confirmNewCategory}>
                  Ok
                </SecondaryButton>
              </div>
            ) : (
              <Select
                value={category}
                onChange={(e) => {
                  if (e.target.value === NEW_CATEGORY) {
                    setAddingCategory(true);
                  } else {
                    setCategory(e.target.value);
                  }
                }}
              >
                <option value="">Nessuna categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                <option value={NEW_CATEGORY}>+ Nuova categoria...</option>
              </Select>
            )}
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

        <Card className="flex flex-col gap-2 bg-lc-bg">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-lc-muted">
            <Clock size={15} /> Tempo di lavoro (opzionale)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ore produzione per pezzo">
              <Input
                type="number"
                step="0.1"
                value={productionHours}
                onChange={(e) => setProductionHours(parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="Ore progettazione (una tantum)">
              <Input
                type="number"
                step="0.1"
                value={designHours}
                onChange={(e) => setDesignHours(parseFloat(e.target.value) || 0)}
              />
            </Field>
          </div>
          {productionCostFromHours != null && (
            <p className="text-sm text-lc-muted">
              Costo manodopera per pezzo: <strong>{formatEUR(productionCostFromHours)}</strong>{' '}
              <button
                type="button"
                onClick={() => setLaborCost(Math.round(productionCostFromHours * 100) / 100)}
                className="font-semibold text-lc-olive underline"
              >
                usa questo costo
              </button>
            </p>
          )}
          {designCostOneTime != null && (
            <p className="text-sm text-lc-muted">
              Costo progettazione template (una tantum, non per pezzo):{' '}
              <strong>{formatEUR(designCostOneTime)}</strong> — da riguadagnare sulle prime vendite,
              non incide sul margine per pezzo qui sotto.
            </p>
          )}
        </Card>

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
              const unitPrice = mat ? effectiveUnitCost(mat) : 0;
              return (
                <div key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
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
                  {mat && (
                    <p className="text-xs text-lc-muted">
                      {line.quantity} {mat.unit} × {formatEUR(unitPrice)}/{mat.unit} ={' '}
                      <strong className="text-lc-text">{formatEUR(unitPrice * line.quantity)}</strong>
                      {mat.packageQty && mat.packagePrice ? ` (prezzo per singolo pezzo, dalla confezione da ${mat.packageQty})` : ''}
                    </p>
                  )}
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
