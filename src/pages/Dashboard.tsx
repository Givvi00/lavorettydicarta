import {
  ClipboardList,
  FileClock,
  Euro,
  Users2,
  AlertTriangle,
  ShoppingCart,
  ShoppingBag,
  Wallet,
  Scissors,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Card, Badge, EmptyState, type TapeColor } from '@/components/ui/primitives';
import { MonthOrdersChart } from '@/components/MonthOrdersChart';
import { formatEUR, orderTotal, aggregateMaterialShortfalls, countsAsRevenue } from '@/utils/calc';

const GIRL_NAME = 'Paola';

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return 'Buonanotte';
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

interface StatTile {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tape: TapeColor;
  sticker: string; // colore di sfondo dell'icona
  hint?: string;
  span?: string; // classi di larghezza nella griglia
  hero?: boolean;
}

function Stat({ tile, index }: { tile: StatTile; index: number }) {
  const { label, value, icon: Icon, tape, sticker, hint, span = '', hero } = tile;
  return (
    <Card
      tape={tape}
      lift
      className={`animate-pop-in ${span} ${
        hero ? 'bg-gradient-to-br from-lc-accent/35 via-lc-card to-lc-peach/30' : ''
      }`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {hero && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-card">
          <Sparkles aria-hidden size={64} className="lc-float absolute -right-3 -top-3 text-lc-accent/40" />
        </div>
      )}
      <div
        className={`relative flex ${
          hero
            ? 'items-center gap-4'
            : span
              ? 'items-center gap-3 md:flex-col md:items-start md:gap-2.5'
              : 'flex-col gap-2.5'
        }`}
      >
        <span
          className={`lc-sticker flex shrink-0 items-center justify-center rounded-full text-lc-accent-ink ${sticker} ${
            hero ? 'h-14 w-14' : 'h-10 w-10'
          }`}
        >
          <Icon size={hero ? 26 : 18} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-lc-muted">{label}</p>
          <p className={`font-display font-semibold leading-tight ${hero ? 'text-4xl md:text-5xl' : 'text-2xl md:text-3xl'}`}>
            {value}
          </p>
          {hint && <p className="font-hand text-lg leading-none text-lc-olive">{hint}</p>}
        </div>
      </div>
    </Card>
  );
}

export function Dashboard() {
  const { orders, materials, customers, products } = useStore();

  const activeOrders = orders.filter(
    (o) => o.status !== 'consegnato' && o.status !== 'annullato' && o.status !== 'preventivo'
  );
  const recentOrders = orders.filter((o) => o.status !== 'preventivo');
  const quotes = orders.filter((o) => o.status === 'preventivo');
  const lowStock = materials.filter((m) => m.minStock != null && m.stockQty <= m.minStock);
  const shoppingList = aggregateMaterialShortfalls(orders, products, materials);
  const revenueOrders = orders.filter(countsAsRevenue);
  const totalRevenue = revenueOrders.reduce((sum, o) => sum + orderTotal(o), 0);
  const ordersThisMonth = revenueOrders.filter((o) => {
    const d = new Date(o.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const revenueThisMonth = ordersThisMonth.reduce((sum, o) => sum + orderTotal(o), 0);

  const monthName = new Date().toLocaleDateString('it-IT', { month: 'long' });
  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  const tiles: StatTile[] = [
    { label: 'Ordini totali', value: revenueOrders.length, icon: ShoppingBag, tape: 'yellow', sticker: 'bg-lc-accent' },
    { label: 'Ordini attivi', value: activeOrders.length, icon: ClipboardList, tape: 'mint', sticker: 'bg-lc-mint' },
    { label: 'Preventivi', value: quotes.length, icon: FileClock, tape: 'pink', sticker: 'bg-lc-pink' },
    { label: 'Incasso totale', value: formatEUR(totalRevenue), icon: Wallet, tape: 'sky', sticker: 'bg-lc-sky' },
    {
      label: `Incasso di ${monthName}`,
      value: formatEUR(revenueThisMonth),
      icon: Euro,
      tape: 'peach',
      sticker: 'bg-lc-peach',
      hint: `${ordersThisMonth.length} ordin${ordersThisMonth.length === 1 ? 'e' : 'i'} questo mese`,
      span: 'col-span-2 md:col-span-3',
      hero: true,
    },
    { label: 'Clienti', value: customers.length, icon: Users2, tape: 'lilac', sticker: 'bg-lc-lilac', span: 'col-span-2 md:col-span-1' },
  ];

  return (
    <div className="flex animate-slide-up flex-col gap-4 p-4 md:gap-5 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-x-4">
        <div>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">
            {greeting()}, <span className="lc-marker">{GIRL_NAME}</span>!{' '}
            <span className="inline-block animate-wiggle">✂️</span>
          </h1>
          <p className="font-hand text-xl leading-tight text-lc-muted">Ecco come va il tuo angolo creativo oggi.</p>
        </div>
        <p className="font-hand text-xl leading-none text-lc-olive first-letter:uppercase">{today}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {tiles.map((tile, i) => (
          <Stat key={tile.label} tile={tile} index={i} />
        ))}
      </div>

      <MonthOrdersChart orders={orders} />

      <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start md:gap-5">
        {shoppingList.length > 0 && (
          <Card tape="pink" className="border-lc-danger/30">
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

        {lowStock.length > 0 && (
          <Card tape="peach" className="border-lc-danger/30">
            <p className="mb-2 flex items-center gap-1.5 font-display font-semibold text-lc-danger">
              <AlertTriangle size={16} /> Materiali sotto scorta
            </p>
            <ul className="flex flex-col gap-1.5">
              {lowStock.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <span>{m.name}</span>
                  <Badge tone="danger">
                    {m.stockQty} / min {m.minStock} {m.unit}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card tape="yellow">
          <p className="mb-2 font-hand text-2xl leading-none">Ultimi ordini</p>
          {recentOrders.length === 0 ? (
            <EmptyState icon={<Scissors />} text="Ancora nessun ordine: creane uno dalla scheda Ordini!" />
          ) : (
            <ul className="flex flex-col gap-2">
              {recentOrders.slice(0, 5).map((o) => {
                const customer = customers.find((c) => c.id === o.customerId);
                const initials = (customer?.name ?? '?').slice(0, 1).toUpperCase();
                return (
                  <li key={o.id} className="flex items-center gap-3 text-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lc-accent/40 font-display font-semibold text-lc-accent-ink">
                      {initials}
                    </span>
                    <span className="flex-1">{customer?.name ?? 'Cliente sconosciuto'}</span>
                    <span className="font-semibold text-lc-muted">{formatEUR(orderTotal(o))}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-center font-hand text-xl text-lc-muted">
        {products.length} prodott{products.length === 1 ? 'o' : 'i'} in catalogo · fatto con 🧡 per te
      </p>
    </div>
  );
}
