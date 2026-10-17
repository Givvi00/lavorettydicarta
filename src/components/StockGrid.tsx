import { useEffect, useMemo, useState } from 'react';
import { Boxes, Check } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Badge, Card, Input, Select } from '@/components/ui/primitives';
import { effectiveUnitCost, formatEUR } from '@/utils/calc';
import type { Material } from '@/types';

type SortKey = 'name' | 'value' | 'qty' | 'low';

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const valueOf = (m: Material) => m.stockQty * effectiveUnitCost(m);
const isLow = (m: Material) => m.minStock != null && m.minStock > 0 && m.stockQty <= m.minStock;

/** Una riga della griglia: giacenza e costo si modificano sul posto e si salvano quando esci dal campo */
function StockRow({ m, share, onOpen }: { m: Material; share: number; onOpen: (m: Material) => void }) {
  const upsertMaterial = useStore((s) => s.upsertMaterial);
  const unitCost = round(effectiveUnitCost(m), 4);
  const [qty, setQty] = useState(m.stockQty);
  const [cost, setCost] = useState(unitCost);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // se il materiale cambia da altrove (scontrino, ordini, scarico) la riga si aggiorna
  useEffect(() => setQty(m.stockQty), [m.stockQty]);
  useEffect(() => setCost(unitCost), [unitCost]);

  async function commit(patch: Partial<Material>) {
    setError('');
    try {
      await upsertMaterial({ id: m.id, ...patch });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1200);
    } catch (err) {
      console.error(err);
      setError('Non salvato, riprova.');
    }
  }

  function commitQty() {
    const next = Math.max(0, qty);
    if (next !== m.stockQty) commit({ stockQty: round(next, 4) });
  }

  function commitCost() {
    const next = Math.max(0, cost);
    if (next === unitCost) return;
    // con una confezione il costo del pezzo deriva da prezzo ÷ pezzi: aggiorno il prezzo della confezione
    if (m.packageQty && m.packagePrice) commit({ unitCost: next, packagePrice: round(next * m.packageQty) });
    else commit({ unitCost: next });
  }

  const value = qty * cost;
  const low = isLow({ ...m, stockQty: qty });
  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
  };
  const cell = 'w-full min-w-0 text-right !py-1 !px-2 text-sm tabular-nums';

  return (
    <div
      className={`relative grid grid-cols-3 items-center gap-x-2 gap-y-1 overflow-hidden rounded-btn border-2 px-2.5 py-1.5 md:grid-cols-[minmax(0,1fr)_7rem_7rem_6.5rem] ${
        low ? 'border-lc-danger/40 bg-lc-danger/5' : 'border-lc-border bg-lc-surface'
      }`}
    >
      {/* barra di sfondo: quanto pesa questo materiale sul valore del magazzino */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 bg-lc-accent/15"
        style={{ width: `${Math.max(share * 100, value > 0 ? 2 : 0)}%` }}
      />
      <div className="relative col-span-3 flex min-w-0 items-center gap-2 md:col-span-1">
        {m.photo ? (
          <img src={m.photo} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-lc-accent/20 text-lc-olive">
            <Boxes size={13} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen(m)}
            className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-left"
            aria-label={`Apri la scheda di ${m.name}`}
          >
            <span className="break-words text-sm font-semibold leading-tight hover:underline">{m.name}</span>
            {m.category && <Badge>{m.category}</Badge>}
            {low && <Badge tone="danger">scorta bassa</Badge>}
            {saved && <Check size={15} className="text-lc-success" aria-label="Salvato" />}
          </button>
          {error && <p className="text-xs font-semibold text-lc-danger">{error}</p>}
        </div>
      </div>
      <label className="relative flex min-w-0 flex-col gap-0.5">
        <span className="text-[10px] font-semibold leading-none text-lc-muted md:hidden">Giacenza ({m.unit})</span>
        <div className="flex items-center gap-1.5">
          <Input
            className={cell}
            type="number"
            step="0.01"
            inputMode="decimal"
            aria-label={`Giacenza di ${m.name}`}
            value={qty}
            onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
            onBlur={commitQty}
            onKeyDown={onEnter}
          />
          <span className="hidden w-12 shrink-0 truncate text-xs text-lc-muted md:inline">{m.unit}</span>
        </div>
      </label>
      <label className="relative flex min-w-0 flex-col gap-0.5">
        <span className="text-[10px] font-semibold leading-none text-lc-muted md:hidden">Costo (€/{m.unit})</span>
        <Input
          className={cell}
          type="number"
          step="0.01"
          inputMode="decimal"
          aria-label={`Costo di ${m.name}`}
          value={cost}
          onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
          onBlur={commitCost}
          onKeyDown={onEnter}
        />
      </label>
      <div className="relative flex min-w-0 flex-col gap-0.5 text-right">
        <span className="text-[10px] font-semibold leading-none text-lc-muted md:hidden">Valore</span>
        <span className="font-display text-sm font-semibold tabular-nums">{formatEUR(value)}</span>
      </div>
    </div>
  );
}

/** Magazzino in griglia: valore totale in euro, dove sono i soldi fermi e giacenze/costi modificabili al volo */
export function StockGrid({ materials, onOpen }: { materials: Material[]; onOpen: (m: Material) => void }) {
  const [sort, setSort] = useState<SortKey>('value');

  const sorted = useMemo(() => {
    const list = [...materials];
    if (sort === 'value') list.sort((a, b) => valueOf(b) - valueOf(a));
    else if (sort === 'qty') list.sort((a, b) => b.stockQty - a.stockQty);
    else if (sort === 'low') list.sort((a, b) => Number(isLow(b)) - Number(isLow(a)) || a.name.localeCompare(b.name));
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [materials, sort]);

  const total = materials.reduce((s, m) => s + valueOf(m), 0);
  const maxValue = materials.reduce((mx, m) => Math.max(mx, valueOf(m)), 0);
  const lowCount = materials.filter(isLow).length;

  // valore per categoria, dal più alto
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of materials) {
      const key = m.category?.trim() || 'Senza categoria';
      map.set(key, (map.get(key) ?? 0) + valueOf(m));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [materials]);
  const topCategories = byCategory.slice(0, 6);
  const otherValue = byCategory.slice(6).reduce((s, [, v]) => s + v, 0);
  const bars = otherValue > 0 ? [...topCategories, ['Altre', otherValue] as [string, number]] : topCategories;
  const maxBar = bars.reduce((mx, [, v]) => Math.max(mx, v), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card className="col-span-2 flex flex-col gap-0.5 md:col-span-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-lc-muted">Valore del magazzino</span>
          <span className="font-display text-3xl font-semibold tabular-nums">{formatEUR(total)}</span>
        </Card>
        <Card className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-lc-muted">Materiali</span>
          <span className="font-display text-2xl font-semibold tabular-nums">{materials.length}</span>
        </Card>
        <Card className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-lc-muted">Sotto scorta</span>
          <span className={`font-display text-2xl font-semibold tabular-nums ${lowCount > 0 ? 'text-lc-danger' : ''}`}>{lowCount}</span>
        </Card>
      </div>

      {bars.length > 1 && total > 0 && (
        <Card className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Dove sono i soldi</span>
          <ul className="flex flex-col gap-1.5">
            {bars.map(([label, v]) => (
              <li key={label} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2 text-sm md:grid-cols-[10rem_1fr_auto]">
                <span className="truncate text-lc-muted">{label}</span>
                <span className="h-3 overflow-hidden rounded-full bg-lc-border/40">
                  <span className="block h-full rounded-full bg-lc-olive" style={{ width: `${maxBar > 0 ? (v / maxBar) * 100 : 0}%` }} />
                </span>
                <span className="font-semibold tabular-nums">{formatEUR(v)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-lc-muted">Cambia giacenza o costo e premi Invio: si salva da solo.</p>
        <Select className="!py-1.5 text-sm" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordina per">
          <option value="value">Per valore</option>
          <option value="name">Per nome</option>
          <option value="qty">Per giacenza</option>
          <option value="low">Sotto scorta prima</option>
        </Select>
      </div>

      {/* intestazioni di colonna, solo da schermo largo */}
      <div className="hidden grid-cols-[minmax(0,1fr)_7rem_7rem_6.5rem] gap-x-2 px-3 text-xs font-semibold uppercase tracking-wide text-lc-muted md:grid">
        <span>Materiale</span>
        {/* stesso schema delle righe: il campo, poi lo spazio dell'unità di misura; pr = margine interno del campo */}
        <span className="flex items-center gap-1.5">
          <span className="min-w-0 flex-1 pr-[10px] text-right">Giacenza</span>
          <span className="w-12 shrink-0" />
        </span>
        <span className="pr-[10px] text-right">Costo €/unità</span>
        <span className="text-right">Valore</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {sorted.map((m) => (
          <StockRow key={m.id} m={m} share={maxValue > 0 ? valueOf(m) / maxValue : 0} onOpen={onOpen} />
        ))}
        {sorted.length === 0 && <p className="text-sm text-lc-muted">Nessun materiale con questi filtri.</p>}
      </div>
    </div>
  );
}
