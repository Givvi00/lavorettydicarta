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
  Badge,
  EmptyState,
} from '@/components/ui/primitives';
import { Boxes, ExternalLink, Package2, Receipt, ShoppingCart, Tags, PackageMinus, LayoutGrid, Table2 } from 'lucide-react';
import { PageBar } from '@/components/ui/PageBar';
import { PhotoPicker, Lightbox } from '@/components/ui/PhotoPicker';
import { ScanReceiptModal } from '@/components/ScanReceiptModal';
import { StockGrid } from '@/components/StockGrid';
import { formatEUR, aggregateMaterialShortfalls, effectiveUnitCost } from '@/utils/calc';
import { UNITS } from '@/data/units';
import type { Material } from '@/types';

/** Valori distinti (ordinati) di un campo testuale dei materiali, es. categorie o fornitori */
export function distinctValues(materials: Material[], key: 'category' | 'supplier'): string[] {
  const set = new Set<string>();
  for (const m of materials) {
    const v = m[key]?.trim();
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function Materiali() {
  const { materials, orders, products, upsertMaterial, deleteMaterial } = useStore();
  const [editing, setEditing] = useState<Material | null>(null);
  const [creating, setCreating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [managing, setManaging] = useState(false);
  const [adjusting, setAdjusting] = useState<Material | null>(null);
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [supFilter, setSupFilter] = useState('');
  // vista scelta: schede oppure griglia di magazzino (si ricorda su questo dispositivo)
  const [view, setViewState] = useState<'cards' | 'grid'>(() => {
    try {
      return localStorage.getItem('lc-materials-view') === 'grid' ? 'grid' : 'cards';
    } catch {
      return 'cards';
    }
  });
  function setView(v: 'cards' | 'grid') {
    setViewState(v);
    try {
      localStorage.setItem('lc-materials-view', v);
    } catch {
      /* ignora */
    }
  }

  const categories = distinctValues(materials, 'category');
  const suppliers = distinctValues(materials, 'supplier');
  const filtered = materials.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) &&
      (!catFilter || (catFilter === '__none' ? !m.category?.trim() : m.category?.trim() === catFilter)) &&
      (!supFilter || (supFilter === '__none' ? !m.supplier?.trim() : m.supplier?.trim() === supFilter))
  );
  const shoppingList = aggregateMaterialShortfalls(orders, products, materials);

  return (
    <div className="flex animate-slide-up flex-col gap-4 p-4 md:gap-5 md:p-8">
      <PageBar
        title={<span className="lc-marker">Materiali</span>}
        actions={
          <>
            <SecondaryButton onClick={() => setManaging(true)}>
              <Tags size={16} className="mr-1 inline -mt-0.5" /> Categorie
            </SecondaryButton>
            <SecondaryButton data-tour="btn-scontrino" onClick={() => setScanning(true)}>
              <Receipt size={16} className="mr-1 inline -mt-0.5" /> Scontrino
            </SecondaryButton>
            <PrimaryButton data-tour="btn-nuovo" onClick={() => setCreating(true)}>+ Nuovo</PrimaryButton>
          </>
        }
        filters={
          <>
            <Input
              className="w-full md:max-w-xs"
              placeholder="Cerca materiale..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {(categories.length > 0 || suppliers.length > 0) && (
              <>
                <Select
                  className="min-w-0 flex-1 md:flex-none"
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  aria-label="Filtra per categoria"
                >
                  <option value="">Tutte le categorie</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__none">Senza categoria</option>
                </Select>
                <Select
                  className="min-w-0 flex-1 md:flex-none"
                  value={supFilter}
                  onChange={(e) => setSupFilter(e.target.value)}
                  aria-label="Filtra per fornitore"
                >
                  <option value="">Tutti i fornitori</option>
                  {suppliers.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="__none">Senza fornitore</option>
                </Select>
              </>
            )}
            <div className="grid shrink-0 grid-cols-2 gap-0.5 rounded-btn border-2 border-lc-border bg-lc-accent/10 p-0.5" role="group" aria-label="Vista">
              {([['cards', 'Schede', LayoutGrid], ['grid', 'Magazzino', Table2]] as const).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  onClick={() => setView(id)}
                  className={`flex items-center justify-center gap-1.5 rounded-[0.6rem] px-2.5 py-1 font-display text-sm font-semibold transition-colors ${view === id ? 'bg-lc-accent text-lc-accent-text' : 'text-lc-muted'}`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </>
        }
      />

      {shoppingList.length > 0 && (
        <Card className="border-lc-danger/30">
          <p className="mb-2 flex items-center gap-1.5 font-display font-semibold text-lc-danger">
            <ShoppingCart size={16} /> Da comprare per gli ordini in corso
          </p>
          <ul className="flex flex-col gap-1.5">
            {shoppingList.map((s) => (
              <li key={s.material.id} className="flex items-center justify-between text-sm">
                <span>{s.material.name}</span>
                <Badge tone="danger">
                  mancano {Math.round(s.missing * 100) / 100} {s.material.unit}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {view === 'grid' && <StockGrid materials={filtered} onOpen={setEditing} />}

      <div className={view === 'grid' ? 'hidden' : 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'}>
        {filtered.length === 0 && (
          <EmptyState icon={<Boxes />} text="Il magazzino è vuoto: aggiungi il primo materiale." />
        )}
        {filtered.map((m) => {
          const low = m.minStock != null && m.stockQty <= m.minStock;
          return (
            <Card key={m.id} lift className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                {m.photo && (
                  <button
                    type="button"
                    aria-label="Ingrandisci foto"
                    onClick={() => setZoomPhoto(m.photo!)}
                    className="shrink-0"
                  >
                    <img src={m.photo} alt="" className="h-14 w-14 cursor-zoom-in rounded-btn object-cover" />
                  </button>
                )}
                <div onClick={() => setEditing(m)} className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left">
                  {!m.photo && (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-btn bg-lc-accent/20 text-lc-olive">
                      <Boxes size={20} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold leading-snug">{m.name}</p>
                    {(m.category || low) && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {m.category && <Badge>{m.category}</Badge>}
                        {low && <Badge tone="danger">scorta bassa</Badge>}
                      </div>
                    )}
                    <p className="mt-1 text-sm text-lc-muted">
                      {m.stockQty} {m.unit} disponibili · {formatEUR(effectiveUnitCost(m))}/{m.unit}
                      {m.supplier ? ` · ${m.supplier}` : ''}
                    </p>
                    {m.packageQty && m.packagePrice ? (
                      <p className="text-xs text-lc-muted">
                        Confezione: {m.packageQty} {m.unit} · {formatEUR(m.packagePrice)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-dashed border-lc-border pt-3">
                {m.purchaseUrl && (
                  <a
                    href={m.purchaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Apri link acquisto"
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-btn bg-lc-accent/20 px-3 text-sm font-semibold text-lc-olive transition-transform active:scale-95"
                  >
                    <ExternalLink size={15} /> Link
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setAdjusting(m)}
                  aria-label="Carica o scarica giacenza"
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-btn bg-lc-accent/20 px-3 text-sm font-semibold text-lc-olive transition-transform active:scale-95"
                >
                  <PackageMinus size={15} /> Giacenza
                </button>
                <SecondaryButton className="!py-1.5 flex-1 !text-sm" onClick={() => setEditing(m)}>
                  Modifica
                </SecondaryButton>
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
          key={editing.id}
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
          onDuplicate={async () => {
            // la copia parte con giacenza 0 (è un altro articolo) e si apre subito per modificarla
            const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = editing;
            const copy = await upsertMaterial({ ...rest, name: `${editing.name} (copia)`, stockQty: 0 });
            setEditing(copy);
          }}
        />
      )}

      {scanning && <ScanReceiptModal open={scanning} onClose={() => setScanning(false)} />}
      {managing && <ManageGroupsModal onClose={() => setManaging(false)} />}
      {adjusting && <StockAdjustModal material={adjusting} onClose={() => setAdjusting(null)} />}
      {zoomPhoto && <Lightbox src={zoomPhoto} onClose={() => setZoomPhoto(null)} />}
    </div>
  );
}

/** Rinomina o svuota categorie e fornitori in blocco (aggiorna tutti i materiali che le usano) */
function ManageGroupsModal({ onClose }: { onClose: () => void }) {
  const { materials, upsertMaterial } = useStore();
  const [kind, setKind] = useState<'category' | 'supplier'>('category');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const values = distinctValues(materials, kind);

  async function apply(from: string, to: string) {
    setBusy(true);
    try {
      for (const m of materials.filter((x) => x[kind]?.trim() === from)) {
        await upsertMaterial({ id: m.id, [kind]: to.trim() });
      }
      setDrafts((d) => {
        const { [from]: _gone, ...rest } = d;
        return rest;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Categorie e fornitori" confirmClose={false}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <SecondaryButton type="button" onClick={() => setKind('category')} className={kind === 'category' ? '!bg-lc-accent !text-lc-accent-text' : ''}>
            Categorie
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => setKind('supplier')} className={kind === 'supplier' ? '!bg-lc-accent !text-lc-accent-text' : ''}>
            Fornitori
          </SecondaryButton>
        </div>
        <p className="text-sm text-lc-muted">
          Si creano scrivendole nella scheda di un materiale. Qui puoi rinominarle (si aggiornano tutti i materiali) o
          toglierle.
        </p>
        {values.length === 0 && <p className="text-sm text-lc-muted">Ancora nessuna: assegnala da "Modifica" su un materiale.</p>}
        {values.map((v) => {
          const count = materials.filter((m) => m[kind]?.trim() === v).length;
          const draft = drafts[v] ?? v;
          return (
            <div key={v} className="flex items-center gap-2">
              <Input
                className="min-w-0 flex-1"
                value={draft}
                onChange={(e) => setDrafts({ ...drafts, [v]: e.target.value })}
              />
              <span className="shrink-0 text-xs text-lc-muted">{count} mat.</span>
              <SecondaryButton type="button" disabled={busy || !draft.trim() || draft.trim() === v} onClick={() => apply(v, draft)}>
                Rinomina
              </SecondaryButton>
              <button
                type="button"
                disabled={busy}
                onClick={() => apply(v, '')}
                className="text-lc-danger"
                aria-label={`Togli ${v} dai materiali`}
                title="Togli dai materiali"
              >
                ✕
              </button>
            </div>
          );
        })}
        <div className="flex justify-end">
          <PrimaryButton type="button" onClick={onClose}>Fatto</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

/** Carico/scarico libero della giacenza (consumo fuori ordine, rotture, inventario...) */
function StockAdjustModal({ material, onClose }: { material: Material; onClose: () => void }) {
  const { upsertMaterial } = useStore();
  const [mode, setMode] = useState<'scarico' | 'carico' | 'imposta'>('scarico');
  const [qty, setQty] = useState(0);

  const next =
    mode === 'imposta' ? qty : Math.max(0, material.stockQty + (mode === 'carico' ? qty : -qty));
  const rounded = Math.round(next * 100) / 100;

  return (
    <Modal open onClose={onClose} title={`Giacenza: ${material.name}`}>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          await upsertMaterial({ id: material.id, stockQty: rounded });
          onClose();
        }}
      >
        <p className="text-sm text-lc-muted">
          Ora in magazzino: <strong className="text-lc-text">{material.stockQty} {material.unit}</strong>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(['scarico', 'carico', 'imposta'] as const).map((m) => (
            <SecondaryButton
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={mode === m ? '!bg-lc-accent !text-lc-accent-text' : ''}
            >
              {m === 'scarico' ? 'Scarica' : m === 'carico' ? 'Carica' : 'Imposta a'}
            </SecondaryButton>
          ))}
        </div>
        <Field label={`Quantità (${material.unit})`}>
          <Input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
          />
        </Field>
        <p className="text-sm">
          Dopo: <strong>{rounded} {material.unit}</strong>
          {mode === 'scarico' && qty > material.stockQty && (
            <span className="text-lc-danger"> (non può andare sotto zero)</span>
          )}
        </p>
        <div className="flex justify-end">
          <PrimaryButton type="submit">Conferma</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export function MaterialForm({
  open,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Material>) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  initial?: Partial<Material>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? 'pz');
  const [unitCost, setUnitCost] = useState(initial?.unitCost ?? 0);
  const [supplier, setSupplier] = useState(initial?.supplier ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const allMaterials = useStore((s) => s.materials);
  const [stockQty, setStockQty] = useState(initial?.stockQty ?? 0);
  const [minStock, setMinStock] = useState(initial?.minStock ?? 0);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [packageQty, setPackageQty] = useState(initial?.packageQty ?? 0);
  const [packagePrice, setPackagePrice] = useState(initial?.packagePrice ?? 0);
  const [buyMode, setBuyMode] = useState<'single' | 'pack'>(initial?.packageQty && initial?.packagePrice ? 'pack' : 'single');
  const [purchaseUrl, setPurchaseUrl] = useState(initial?.purchaseUrl ?? '');
  const [photo, setPhoto] = useState(initial?.photo ?? '');
  const [openSec, setOpenSec] = useState({ id: true, price: true, stock: false, extra: false });
  const [submitted, setSubmitted] = useState(false);

  const costPerUnitFromPackage =
    buyMode === 'pack' && packageQty > 0 && packagePrice > 0 ? Math.round((packagePrice / packageQty) * 10000) / 10000 : null;
  const finalCost = buyMode === 'pack' ? costPerUnitFromPackage ?? 0 : unitCost;

  // Campi obbligatori: nome e prezzo (di un pezzo, oppure pezzi e prezzo della confezione)
  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = 'Scrivi il nome del materiale';
  if (buyMode === 'single' && !(unitCost > 0)) errors.unitCost = 'Inserisci il costo di un pezzo';
  if (buyMode === 'pack' && !(packageQty > 0)) errors.packageQty = 'Quanti pezzi ci sono nella confezione?';
  if (buyMode === 'pack' && !(packagePrice > 0)) errors.packagePrice = 'Inserisci il prezzo della confezione';
  const shown = submitted ? errors : {};

  function trySave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const keys = Object.keys(errors);
    if (keys.length > 0) {
      setOpenSec((s) => ({ ...s, id: s.id || !!errors.name, price: s.price || keys.some((k) => k !== 'name') }));
      setTimeout(() => document.getElementById(`mat-${keys[0]}`)?.focus(), 50);
      return;
    }
    onSave({
      name: name.trim(),
      unit,
      unitCost: finalCost,
      supplier: supplier.trim(),
      category: category.trim(),
      stockQty,
      minStock,
      notes,
      packageQty: buyMode === 'pack' ? packageQty : undefined,
      packagePrice: buyMode === 'pack' ? packagePrice : undefined,
      purchaseUrl,
      photo,
    });
  }

  const err = (k: string) => (shown[k] ? '!border-lc-danger' : '');

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Modifica materiale' : 'Nuovo materiale'}>
      <form className="flex flex-col gap-3" onSubmit={trySave} noValidate>
        <PhotoPicker value={photo} onChange={setPhoto} />

        <Section
          title="Cos'è"
          summary={[name.trim() || 'Senza nome', category.trim()].filter(Boolean).join(' · ')}
          open={openSec.id}
          onToggle={(v) => setOpenSec((s) => ({ ...s, id: v }))}
        >
          {/* niente autoFocus: da telefono la tastiera non deve aprirsi da sola */}
          <Field label="Nome *" error={shown.name}>
            <Input id="mat-name" className={err('name')} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Categoria">
              <Input list="mat-categories" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Carta, Colle, Nastri..." />
              <datalist id="mat-categories">
                {distinctValues(allMaterials, 'category').map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Fornitore">
              <Input list="mat-suppliers" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Amazon, Action..." />
              <datalist id="mat-suppliers">
                {distinctValues(allMaterials, 'supplier').map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
          </div>
          <Field label="Unità di misura">
            <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
              {/* se un materiale ha un'unità fuori elenco la mostriamo comunque, finché non la cambi */}
              {[...(UNITS.includes(unit as (typeof UNITS)[number]) ? [] : [unit]), ...UNITS].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </Field>
        </Section>

        <Section
          title="Prezzo"
          summary={finalCost > 0 ? `${formatEUR(finalCost)}/${unit}` : 'da inserire'}
          open={openSec.price}
          onToggle={(v) => setOpenSec((s) => ({ ...s, price: v }))}
        >
          <div className="grid grid-cols-2 gap-1 rounded-btn border-2 border-lc-border bg-lc-accent/10 p-1" role="radiogroup" aria-label="Come lo compri">
            {(['single', 'pack'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={buyMode === mode}
                onClick={() => setBuyMode(mode)}
                className={`flex items-center justify-center gap-1.5 rounded-[0.8rem] px-2 py-2 font-display text-sm font-semibold transition-colors ${buyMode === mode ? 'bg-lc-accent text-lc-accent-text' : 'text-lc-muted'}`}
              >
                {mode === 'pack' && <Package2 size={15} />}
                {mode === 'single' ? 'Pezzo singolo' : 'Confezione'}
              </button>
            ))}
          </div>
          {buyMode === 'single' ? (
            <Field label="Costo di un pezzo (€)" error={shown.unitCost}>
              <Input id="mat-unitCost" className={err('unitCost')} type="number" step="0.01" inputMode="decimal" value={unitCost} onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)} />
            </Field>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`${unit || 'Pezzi'} nella confezione *`} error={shown.packageQty}>
                  <Input id="mat-packageQty" className={err('packageQty')} type="number" step="1" inputMode="numeric" value={packageQty} onChange={(e) => setPackageQty(parseFloat(e.target.value) || 0)} />
                </Field>
                <Field label="Prezzo confezione (€) *" error={shown.packagePrice}>
                  <Input id="mat-packagePrice" className={err('packagePrice')} type="number" step="0.01" inputMode="decimal" value={packagePrice} onChange={(e) => setPackagePrice(parseFloat(e.target.value) || 0)} />
                </Field>
              </div>
              <p className="rounded-btn bg-lc-accent/10 px-3 py-2 text-sm font-semibold">
                {costPerUnitFromPackage != null ? (
                  <>
                    Un pezzo costa <span className="text-lc-success">{formatEUR(costPerUnitFromPackage)}</span>. È il costo che usa la distinta base.
                  </>
                ) : (
                  'Inserisci pezzi e prezzo per vedere quanto costa un pezzo.'
                )}
              </p>
            </>
          )}
        </Section>

        <Section
          title="Magazzino"
          summary={`${stockQty} ${unit}`}
          open={openSec.stock}
          onToggle={(v) => setOpenSec((s) => ({ ...s, stock: v }))}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="In magazzino">
              <Input type="number" step="0.01" inputMode="decimal" value={stockQty} onChange={(e) => setStockQty(parseFloat(e.target.value) || 0)} />
            </Field>
            <Field label="Avvisami sotto">
              <Input type="number" step="0.01" inputMode="decimal" value={minStock} onChange={(e) => setMinStock(parseFloat(e.target.value) || 0)} />
            </Field>
          </div>
          <p className="text-xs font-semibold text-lc-muted">La giacenza si conta in pezzi singoli ({unit}), anche se compri a confezioni.</p>
        </Section>

        <Section
          title="Link e note"
          summary={purchaseUrl || notes ? 'compilato' : 'vuoto'}
          open={openSec.extra}
          onToggle={(v) => setOpenSec((s) => ({ ...s, extra: v }))}
        >
          <Field label="Link acquisto (es. Amazon, Cricut store...)">
            <Input type="url" value={purchaseUrl} onChange={(e) => setPurchaseUrl(e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Note">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </Field>
        </Section>

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
