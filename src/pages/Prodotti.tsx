import { distinctValues } from '@/pages/Materiali';
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
  Section,
  DurationInput,
  Badge,
  EmptyState,
} from '@/components/ui/primitives';
import { Package, Tags, Trash2, Sparkles } from 'lucide-react';
import { PageBar } from '@/components/ui/PageBar';
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
      <PageBar
        title={<span className="lc-marker">Prodotti</span>}
        actions={
          <>
            <SecondaryButton onClick={() => setManagingCategories(true)}>
              <Tags size={16} className="mr-1 inline -mt-0.5" /> Categorie
            </SecondaryButton>
            <SecondaryButton
              onClick={() => setCreatingByVoice(true)}
              className="lc-ai-gradient border-transparent text-lc-accent-text"
            >
              <Sparkles size={16} className="mr-1 inline -mt-0.5" /> Racconta
            </SecondaryButton>
            <PrimaryButton data-tour="btn-nuovo" onClick={() => setCreating(true)}>
              + Nuovo
            </PrimaryButton>
          </>
        }
        filters={
          <>
            <Input
              className="min-w-0 flex-1 md:max-w-xs md:flex-none"
              placeholder="Cerca prodotto..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select
              className="min-w-0 flex-1 md:max-w-xs md:flex-none"
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
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 && (
          <EmptyState icon={<Package />} text="Nessun prodotto ancora: crea il primo del tuo catalogo." />
        )}
        {filtered.map((p) => {
          const cost = totalCostOf(p, materials);
          const margin = marginOf(p, materials);
          return (
            <Card key={p.id} lift className="flex items-center gap-3">
              <div onClick={() => setEditing(p)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
                {p.photo ? (
                  <img src={p.photo} alt="" className="h-11 w-11 shrink-0 rounded-btn object-cover" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-lc-accent/20 text-lc-olive">
                    <Package size={18} />
                  </span>
                )}
                <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-semibold">{p.name}</p>
                  {p.category && <Badge tone="pink">{p.category}</Badge>}
                  <Badge tone={p.type === 'pronto' ? 'default' : 'accent'}>
                    {p.type === 'pronto' ? 'pronto' : 'personalizzabile'}
                  </Badge>
                  {!p.active && <Badge tone="danger">disattivato</Badge>}
                </div>
                <div className="mt-1 flex flex-col text-sm text-lc-muted">
                  <span>
                    Vendita <span className="font-semibold text-lc-olive">{formatEUR(p.salePrice)}</span>
                  </span>
                  <span>
                    Costo <span className="font-semibold text-lc-danger">{formatEUR(cost)}</span>
                  </span>
                  <span>
                    Margine{' '}
                    <span className={`font-semibold ${margin >= 0 ? 'text-lc-success' : 'text-lc-danger'}`}>{formatEUR(margin)}</span>
                  </span>
                </div>
                </div>
              </div>
              <SecondaryButton className="shrink-0" onClick={() => setEditing(p)}>Modifica</SecondaryButton>
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
          key={editing.id}
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
          onDuplicate={async () => {
            const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = editing;
            const copy = await upsertProduct({ ...rest, name: `${editing.name} (copia)` });
            setEditing(copy);
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
  onDuplicate,
  initial,
  materials,
  categories,
  onAddCategory,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Product>) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
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
  const [openSec, setOpenSec] = useState({ id: true, time: true, mat: true, extra: false });
  const [submitted, setSubmitted] = useState(false);
  const { rates } = useSettings();

  const materialCost = bom.reduce((sum, line) => {
    const mat = materials.find((m) => m.id === line.materialId);
    return sum + (mat ? effectiveUnitCost(mat) * line.quantity : 0);
  }, 0);
  // con un tempo di produzione, la manodopera si calcola da sola (ore × tariffa); senza, vale il costo fisso indicato
  const laborFromTime = productionHours > 0 ? Math.round(productionHours * rates.productionRate * 100) / 100 : null;
  const effectiveLabor = laborFromTime ?? (laborCost || 0);
  const totalCost = materialCost + effectiveLabor;
  const margin = salePrice - totalCost;
  const marginPct = salePrice > 0 ? (margin / salePrice) * 100 : 0;
  const designCostOneTime = designHours > 0 ? designHours * rates.designRate : null;

  // Categorie dei materiali (in ordine) + "" per quelli senza categoria, se ce ne sono: scelta a due passi nella distinta base
  const bomCategories = (() => {
    const named = distinctValues(materials, 'category');
    if (named.length === 0) return [];
    return materials.some((m) => !m.category?.trim()) ? [...named, ''] : named;
  })();

  function addBomLine() {
    if (materials.length === 0) return;
    const first =
      bomCategories.length > 0
        ? materials.find((m) => (m.category?.trim() ?? '') === bomCategories[0]) ?? materials[0]
        : materials[0];
    setBom([...bom, { materialId: first.id, quantity: 1 }]);
  }

  function updateBomLine(index: number, patch: Partial<BomLine>) {
    setBom(bom.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function removeBomLine(index: number) {
    setBom(bom.filter((_, i) => i !== index));
  }

  // Campi obbligatori: nome e prezzo di vendita
  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = 'Scrivi il nome del prodotto';
  if (!(salePrice > 0)) errors.salePrice = 'Inserisci il prezzo di vendita';
  const shown = submitted ? errors : {};
  const errCls = (k: string) => (shown[k] ? '!border-lc-danger' : '');
  const pluralMat = bom.length === 1 ? '1 materiale' : `${bom.length} materiali`;
  const fmtDuration = (h: number) => {
    const t = Math.round(h * 60);
    return t >= 60 ? `${Math.floor(t / 60)} h${t % 60 ? ` ${t % 60} min` : ''}` : `${t} min`;
  };

  function trySave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const keys = Object.keys(errors);
    if (keys.length > 0) {
      setOpenSec((sec) => ({ ...sec, id: true }));
      setTimeout(() => document.getElementById(`prod-${keys[0]}`)?.focus(), 50);
      return;
    }
    onSave({
      name: name.trim(),
      category,
      type,
      salePrice,
      laborCost: effectiveLabor,
      productionHours: productionHours || undefined,
      designHours: designHours || undefined,
      description,
      active,
      bom,
      photo,
    });
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
      <form className="flex flex-col gap-3" onSubmit={trySave} noValidate>
        <PhotoPicker value={photo} onChange={setPhoto} />

        <Section
          title="Cos'è"
          summary={[name.trim() || 'Senza nome', salePrice > 0 ? formatEUR(salePrice) : ''].filter(Boolean).join(' · ')}
          open={openSec.id}
          onToggle={(v) => setOpenSec((sec) => ({ ...sec, id: v }))}
        >
          {/* niente autoFocus: da telefono la tastiera non deve aprirsi da sola */}
          <Field label="Nome *" error={shown.name}>
            <Input id="prod-name" className={errCls('name')} value={name} onChange={(e) => setName(e.target.value)} />
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
          <Field label="Prezzo di vendita (€) *" error={shown.salePrice}>
            <Input
              id="prod-salePrice"
              className={errCls('salePrice')}
              type="number"
              step="0.01"
              inputMode="decimal"
              value={salePrice}
              onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
            />
          </Field>
        </Section>

        <Section
          title="Tempo"
          summary={productionHours > 0 ? `${fmtDuration(productionHours)} a pezzo` : 'nessuno'}
          open={openSec.time}
          onToggle={(v) => setOpenSec((sec) => ({ ...sec, time: v }))}
        >
          <DurationInput label="Produzione, per ogni pezzo" hours={productionHours} onChange={setProductionHours} />
          <DurationInput label="Progettazione, una volta sola" hours={designHours} onChange={setDesignHours} />
          {laborFromTime != null ? (
            <p className="text-sm text-lc-muted">
              Manodopera per pezzo: <strong className="text-lc-text">{formatEUR(laborFromTime)}</strong> ({rates.productionRate} €/h dalle Impostazioni). Si calcola da sola dal tempo.
            </p>
          ) : (
            <Field label="Costo manodopera fisso per pezzo (€), se non indichi il tempo">
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={laborCost}
                onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
              />
            </Field>
          )}
          {designCostOneTime != null && (
            <p className="text-sm text-lc-muted">
              Progettazione del template: <strong className="text-lc-text">{formatEUR(designCostOneTime)}</strong> una tantum, da riguadagnare sulle prime vendite. Non incide sul margine per pezzo.
            </p>
          )}
        </Section>

        <Section
          title="Materiali"
          summary={bom.length > 0 ? pluralMat : 'nessuno'}
          open={openSec.mat}
          onToggle={(v) => setOpenSec((sec) => ({ ...sec, mat: v }))}
        >
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
                  <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                    {bomCategories.length > 0 && (
                      <Select
                        className="w-full sm:w-40 sm:shrink-0"
                        aria-label="Categoria materiale"
                        value={mat?.category?.trim() ?? ''}
                        onChange={(e) => {
                          const first = materials.find((m) => (m.category?.trim() ?? '') === e.target.value);
                          if (first) updateBomLine(i, { materialId: first.id });
                        }}
                      >
                        {bomCategories.map((c) => (
                          <option key={c} value={c}>
                            {c || 'Senza categoria'}
                          </option>
                        ))}
                      </Select>
                    )}
                    <Select
                      className="min-w-0 flex-1"
                      aria-label="Materiale"
                      value={line.materialId}
                      onChange={(e) => updateBomLine(i, { materialId: e.target.value })}
                    >
                      {materials
                        .filter((m) => bomCategories.length === 0 || (m.category?.trim() ?? '') === (mat?.category?.trim() ?? ''))
                        .map((m) => (
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
        </Section>

        <Section
          title="Descrizione"
          summary={description ? 'compilata' : 'vuota'}
          open={openSec.extra}
          onToggle={(v) => setOpenSec((sec) => ({ ...sec, extra: v }))}
        >
          <Field label="Descrizione">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Prodotto attivo
          </label>
        </Section>

        {/* Riepilogo sempre visibile mentre compili: vendita, costo e margine su tre righe */}
        <div className="sticky bottom-0 z-10 flex flex-col gap-0.5 rounded-card border-2 border-lc-border bg-lc-surface px-3 py-2.5 shadow-soft">
          <div className="flex justify-between text-sm">
            <span className="text-lc-muted">Vendita</span>
            <span className="font-semibold text-lc-olive">{formatEUR(salePrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-lc-muted">Costo (materiali {formatEUR(materialCost)} + lavoro {formatEUR(effectiveLabor)})</span>
            <span className="font-semibold text-lc-danger">{formatEUR(totalCost)}</span>
          </div>
          <div className="flex justify-between font-display font-semibold">
            <span className="text-lc-muted">Margine</span>
            <span className={margin >= 0 ? 'text-lc-success' : 'text-lc-danger'}>
              {formatEUR(margin)} ({marginPct.toFixed(0)}%)
            </span>
          </div>
        </div>

        {submitted && Object.keys(errors).length > 0 && (
          <p className="text-sm font-semibold text-lc-danger">Mancano alcuni campi obbligatori: li trovi segnati in rosso.</p>
        )}

        <div className="mt-1 flex items-center justify-between">
          {onDelete ? <DangerButton type="button" onClick={onDelete}>Elimina</DangerButton> : <span />}
          <div className="flex gap-2">
            {onDuplicate && (
              <SecondaryButton type="button" onClick={onDuplicate}>
                Duplica
              </SecondaryButton>
            )}
            <PrimaryButton type="submit">Salva</PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}
