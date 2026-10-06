import { useStore } from '@/store/useStore';
import { Card, Badge } from '@/components/ui/primitives';
import { formatEUR, orderTotal } from '@/utils/calc';

export function Dashboard() {
  const { orders, materials, customers, products } = useStore();

  const activeOrders = orders.filter((o) => o.status !== 'consegnato' && o.status !== 'annullato');
  const quotes = orders.filter((o) => o.status === 'preventivo');
  const lowStock = materials.filter((m) => m.minStock != null && m.stockQty <= m.minStock);
  const revenueThisMonth = orders
    .filter((o) => {
      const d = new Date(o.createdAt);
      const now = new Date();
      return (
        o.status !== 'annullato' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, o) => sum + orderTotal(o), 0);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-sm text-lc-muted">Ordini attivi</p>
          <p className="text-2xl font-semibold">{activeOrders.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-lc-muted">Preventivi in sospeso</p>
          <p className="text-2xl font-semibold">{quotes.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-lc-muted">Incasso mese</p>
          <p className="text-2xl font-semibold">{formatEUR(revenueThisMonth)}</p>
        </Card>
        <Card>
          <p className="text-sm text-lc-muted">Clienti</p>
          <p className="text-2xl font-semibold">{customers.length}</p>
        </Card>
      </div>

      {lowStock.length > 0 && (
        <Card>
          <p className="mb-2 font-medium">Materiali sotto scorta</p>
          <ul className="flex flex-col gap-1">
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
        <p className="mb-2 font-medium">Ultimi ordini</p>
        {orders.length === 0 && <p className="text-sm text-lc-muted">Nessun ordine ancora.</p>}
        <ul className="flex flex-col gap-2">
          {orders.slice(0, 5).map((o) => {
            const customer = customers.find((c) => c.id === o.customerId);
            return (
              <li key={o.id} className="flex items-center justify-between text-sm">
                <span>{customer?.name ?? 'Cliente sconosciuto'}</span>
                <span className="text-lc-muted">{formatEUR(orderTotal(o))}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      <p className="text-xs text-lc-muted">{products.length} prodotti in catalogo</p>
    </div>
  );
}
