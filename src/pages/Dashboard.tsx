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
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Card, Badge, EmptyState } from '@/components/ui/primitives';
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
  const revenueThisMonth = revenueOrders
    .filter((o) => {
      const d = new Date(o.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, o) => sum + orderTotal(o), 0);

  const stats = [
    { label: 'Ordini attivi', value: activeOrders.length, icon: ClipboardList, tone: 'bg-lc-accent/25 text-lc-olive' },
    { label: 'Preventivi', value: quotes.length, icon: FileClock, tone: 'bg-lc-pink/20 text-lc-pink' },
    { label: 'Ordini totali', value: revenueOrders.length, icon: ShoppingBag, tone: 'bg-lc-accent/25 text-lc-olive' },
    { label: 'Incasso mese', value: formatEUR(revenueThisMonth), icon: Euro, tone: 'bg-lc-success/15 text-lc-success' },
    { label: 'Incasso totale', value: formatEUR(totalRevenue), icon: Wallet, tone: 'bg-lc-success/15 text-lc-success' },
    { label: 'Clienti', value: customers.length, icon: Users2, tone: 'bg-lc-border/60 text-lc-text' },
  ];

  return (
    <div className="flex animate-slide-up flex-col gap-4 p-4 md:gap-5 md:p-8">
      <div>
        <h1 className="font-display text-xl font-semibold md:text-2xl">
          {greeting()}, {GIRL_NAME}! <span className="inline-block animate-wiggle">✂️</span>
        </h1>
        <p className="text-sm text-lc-muted">Ecco come va il tuo angolo creativo oggi.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="flex flex-col gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${tone}`}>
              <Icon size={16} />
            </span>
            <div>
              <p className="text-xs font-semibold text-lc-muted">{label}</p>
              <p className="font-display text-xl font-semibold">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      <MonthOrdersChart orders={orders} />

      <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start md:gap-5">
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

        {lowStock.length > 0 && (
          <Card className="border-lc-danger/30">
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

        <Card>
          <p className="mb-2 font-display font-semibold">Ultimi ordini</p>
          {recentOrders.length === 0 ? (
            <EmptyState icon={<Scissors />} text="Ancora nessun ordine: creane uno dalla scheda Ordini!" />
          ) : (
            <ul className="flex flex-col gap-2">
              {recentOrders.slice(0, 5).map((o) => {
                const customer = customers.find((c) => c.id === o.customerId);
                const initials = (customer?.name ?? '?').slice(0, 1).toUpperCase();
                return (
                  <li key={o.id} className="flex items-center gap-3 text-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lc-accent/30 font-display font-semibold text-lc-olive">
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

      <p className="text-center text-xs text-lc-muted">
        {products.length} prodott{products.length === 1 ? 'o' : 'i'} in catalogo · fatto con 🧡 per te
      </p>
    </div>
  );
}
