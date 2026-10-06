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
import { ClipboardList } from 'lucide-react';
import { formatEUR, orderSubtotal, orderTotal, newId } from '@/utils/calc';
import type { Order, OrderItem, OrderStatus } from '@/types';

const STATUS_LABEL: Record<OrderStatus, string> = {
  preventivo: 'Preventivo',
  confermato: 'Confermato',
  in_lavorazione: 'In lavorazione',
  pronto: 'Pronto',
  consegnato: 'Consegnato',
  annullato: 'Annullato',
};

const STATUS_TONE: Record<OrderStatus, 'default' | 'success' | 'danger' | 'accent'> = {
  preventivo: 'default',
  confermato: 'accent',
  in_lavorazione: 'accent',
  pronto: 'success',
  consegnato: 'success',
  annullato: 'danger',
};

export function Ordini() {
  const { orders, customers, products, upsertOrder, deleteOrder } = useStore();
  const [editing, setEditing] = useState<Order | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<OrderStatus | 'tutti'>('tutti');

  const filtered = orders.filter((o) => filter === 'tutti' || o.status === filter);

  return (
    <div className="flex animate-slide-up flex-col gap-4 p-4 md:gap-5 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold md:text-2xl">Ordini &amp; preventivi</h1>
        <PrimaryButton onClick={() => setCreating(true)} disabled={customers.length === 0}>
          + Nuovo
        </PrimaryButton>
      </div>
      {customers.length === 0 && (
        <p className="text-sm text-lc-muted">Aggiungi prima un cliente per creare un ordine.</p>
      )}

      <Select
        className="md:max-w-xs"
        value={filter}
        onChange={(e) => setFilter(e.target.value as OrderStatus | 'tutti')}
      >
        <option value="tutti">Tutti gli stati</option>
        {Object.entries(STATUS_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 && (
          <EmptyState icon={<ClipboardList />} text="Nessun ordine qui: creane uno con “+ Nuovo”." />
        )}
        {filtered.map((o) => {
          const customer = customers.find((c) => c.id === o.customerId);
          return (
            <Card key={o.id} className="flex items-center justify-between">
              <div onClick={() => setEditing(o)} className="flex-1 cursor-pointer text-left">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{customer?.name ?? 'Cliente sconosciuto'}</p>
                  <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                </div>
                <p className="text-sm text-lc-muted">
                  {o.items.length} articoli · {formatEUR(orderTotal(o))}
                  {o.deliveryDate ? ` · consegna ${new Date(o.deliveryDate).toLocaleDateString('it-IT')}` : ''}
                </p>
              </div>
              <SecondaryButton onClick={() => setEditing(o)}>Apri</SecondaryButton>
            </Card>
          );
        })}
      </div>

      {creating && (
        <OrderForm
          open={creating}
          customers={customers}
          products={products}
          onClose={() => setCreating(false)}
          onSave={async (data) => {
            await upsertOrder(data);
            setCreating(false);
          }}
        />
      )}

      {editing && (
        <OrderForm
          open={!!editing}
          initial={editing}
          customers={customers}
          products={products}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            await upsertOrder({ ...data, id: editing.id });
            setEditing(null);
          }}
          onDelete={async () => {
            await deleteOrder(editing.id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function OrderForm({
  open,
  onClose,
  onSave,
  onDelete,
  initial,
  customers,
  products,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Order>) => void;
  onDelete?: () => void;
  initial?: Order;
  customers: ReturnType<typeof useStore.getState>['customers'];
  products: ReturnType<typeof useStore.getState>['products'];
}) {
  const [customerId, setCustomerId] = useState(initial?.customerId ?? customers[0]?.id ?? '');
  const [status, setStatus] = useState<OrderStatus>(initial?.status ?? 'preventivo');
  const [items, setItems] = useState<OrderItem[]>(initial?.items ?? []);
  const [discount, setDiscount] = useState(initial?.discount ?? 0);
  const [deliveryDate, setDeliveryDate] = useState(
    initial?.deliveryDate ? new Date(initial.deliveryDate).toISOString().slice(0, 10) : ''
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const subtotal = orderSubtotal({ items });
  const total = orderTotal({ items, discount });

  function addItem() {
    if (products.length === 0) return;
    const p = products[0];
    setItems([
      ...items,
      { id: newId(), productId: p.id, productName: p.name, quantity: 1, unitPrice: p.salePrice },
    ]);
  }

  function updateItem(index: number, patch: Partial<OrderItem>) {
    setItems(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function setItemProduct(index: number, productId: string) {
    const p = products.find((pr) => pr.id === productId);
    if (!p) return;
    updateItem(index, { productId: p.id, productName: p.name, unitPrice: p.salePrice });
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifica ordine' : 'Nuovo ordine'}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!customerId) return;
          onSave({
            customerId,
            status,
            items,
            discount,
            deliveryDate: deliveryDate ? new Date(deliveryDate).getTime() : undefined,
            notes,
          });
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cliente">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Stato">
            <Select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Data di consegna">
          <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-lc-muted">Articoli</span>
            <SecondaryButton type="button" onClick={addItem} disabled={products.length === 0}>
              + Articolo
            </SecondaryButton>
          </div>
          {products.length === 0 && (
            <p className="text-sm text-lc-muted">Aggiungi prima dei prodotti al catalogo.</p>
          )}
          <div className="flex flex-col gap-3">
            {items.map((item, i) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-btn border border-lc-border p-2">
                <div className="flex items-center gap-2">
                  <Select
                    className="flex-1"
                    value={item.productId}
                    onChange={(e) => setItemProduct(i, e.target.value)}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                  <button type="button" onClick={() => removeItem(i)} className="text-lc-danger" aria-label="Rimuovi">
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Quantità">
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, { quantity: parseFloat(e.target.value) || 1 })}
                    />
                  </Field>
                  <Field label="Prezzo unitario (€)">
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(i, { unitPrice: parseFloat(e.target.value) || 0 })}
                    />
                  </Field>
                </div>
                <Field label="Personalizzazione (nome, data, colori...)">
                  <Input
                    value={item.customization ?? ''}
                    onChange={(e) => updateItem(i, { customization: e.target.value })}
                  />
                </Field>
              </div>
            ))}
          </div>
        </div>

        <Field label="Sconto (€)">
          <Input
            type="number"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
          />
        </Field>

        <Card className="flex flex-col gap-1 bg-lc-bg">
          <div className="flex justify-between text-sm">
            <span className="text-lc-muted">Subtotale</span>
            <span>{formatEUR(subtotal)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Totale</span>
            <span>{formatEUR(total)}</span>
          </div>
        </Card>

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
