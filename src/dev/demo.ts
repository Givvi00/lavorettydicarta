// Solo per lo sviluppo in locale (aprendo l'app con ?demo): dati d'esempio in memoria, senza login
// e senza toccare il database vero. Nel sito pubblicato questo file non viene incluso.
import type { Category, Customer, Material, Order, Product } from '../types';

type StoreName = 'customers' | 'materials' | 'products' | 'orders' | 'categories';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const dayOfMonth = now.getDate();

/** Un giorno del mese corrente (al massimo oggi), così il grafico del mese si popola sempre */
function thisMonth(day: number): number {
  return new Date(now.getFullYear(), now.getMonth(), Math.max(1, Math.min(day, dayOfMonth)), 10).getTime();
}
function inDays(n: number): number {
  return Date.now() + n * DAY;
}

const stamp = { createdAt: Date.now() - 40 * DAY, updatedAt: Date.now() - 40 * DAY };

const categories: Category[] = ['Shadowbox', 'Biglietti', 'Portachiavi', 'Topper'].map((name, i) => ({
  id: `cat${i}`,
  name,
  createdAt: stamp.createdAt,
}));

const customers: Customer[] = [
  { id: 'c1', name: 'Giulia Rossi', phone: '333 1234567', instagram: '@giulia.r', ...stamp },
  { id: 'c2', name: 'Marco Bianchi', phone: '347 7654321', email: 'marco@example.com', ...stamp },
  { id: 'c3', name: 'Sofia Verdi', phone: '320 1112233', instagram: '@sofiaverdi', ...stamp },
  { id: 'c4', name: 'Elena Neri', phone: '339 4445566', ...stamp },
  { id: 'c5', name: 'Chiara Galli', email: 'chiara@example.com', ...stamp },
];

const materials: Material[] = [
  { id: 'm1', name: 'Cartoncino bianco 300g', unit: 'foglio', unitCost: 0.6, stockQty: 18, minStock: 10, supplier: 'Action', packageQty: 24, packagePrice: 14.4, ...stamp },
  { id: 'm2', name: 'Feltro rosa', unit: 'cm', unitCost: 0.08, stockQty: 120, supplier: 'Creatività', ...stamp },
  { id: 'm3', name: 'Anellino portachiavi', unit: 'pz', unitCost: 0.15, stockQty: 8, minStock: 20, supplier: 'Amazon', ...stamp },
  { id: 'm4', name: 'Vinile adesivo oro', unit: 'foglio', unitCost: 1.2, stockQty: 3, minStock: 5, supplier: 'Cricut', ...stamp },
  { id: 'm5', name: 'Colla a caldo', unit: 'pz', unitCost: 0.05, stockQty: 60, supplier: 'Action', ...stamp },
  { id: 'm6', name: 'Cornice shadowbox 20x20', unit: 'pz', unitCost: 4.5, stockQty: 6, minStock: 2, supplier: 'Amazon', ...stamp },
];

const products: Product[] = [
  { id: 'p1', name: 'Portachiavi in feltro', category: 'Portachiavi', type: 'pronto', salePrice: 6.5, productionHours: 0.25, active: true, bom: [{ materialId: 'm2', quantity: 10 }, { materialId: 'm3', quantity: 1 }], ...stamp },
  { id: 'p2', name: 'Shadowbox Baby Shower', category: 'Shadowbox', type: 'personalizzabile', salePrice: 38, productionHours: 2, designHours: 3, active: true, bom: [{ materialId: 'm6', quantity: 1 }, { materialId: 'm1', quantity: 5 }, { materialId: 'm4', quantity: 0.5 }, { materialId: 'm5', quantity: 4 }], ...stamp },
  { id: 'p3', name: 'Biglietto auguri 3D', category: 'Biglietti', type: 'personalizzabile', salePrice: 7.5, productionHours: 0.5, active: true, bom: [{ materialId: 'm1', quantity: 2 }, { materialId: 'm5', quantity: 2 }], ...stamp },
  { id: 'p4', name: 'Cake topper personalizzato', category: 'Topper', type: 'personalizzabile', salePrice: 12, productionHours: 0.4, active: true, bom: [{ materialId: 'm1', quantity: 1 }, { materialId: 'm4', quantity: 0.25 }], ...stamp },
];

function order(id: string, customerId: string, status: Order['status'], createdAt: number, items: [string, number, string?][], deliveryDate?: number): Order {
  return {
    id,
    customerId,
    status,
    discount: 0,
    createdAt,
    updatedAt: createdAt,
    deliveryDate,
    items: items.map(([productId, quantity, customization], i) => {
      const p = products.find((x) => x.id === productId)!;
      return { id: `${id}-${i}`, productId, productName: p.name, quantity, unitPrice: p.salePrice, customization };
    }),
  };
}

const orders: Order[] = [
  order('o1', 'c1', 'confermato', thisMonth(dayOfMonth), [['p2', 1, 'Nome: Sofia, colori rosa e oro']], inDays(6)),
  order('o2', 'c2', 'in_lavorazione', thisMonth(dayOfMonth - 1), [['p1', 4], ['p3', 2, 'Auguri Nonna']], inDays(3)),
  order('o3', 'c3', 'pronto', thisMonth(dayOfMonth - 2), [['p4', 1, 'Buon compleanno Luca']], inDays(1)),
  order('o4', 'c4', 'consegnato', thisMonth(dayOfMonth - 2), [['p1', 6]]),
  order('o5', 'c5', 'consegnato', thisMonth(dayOfMonth - 4), [['p3', 3], ['p4', 1]]),
  order('o6', 'c1', 'preventivo', thisMonth(dayOfMonth), [['p2', 2, 'Gender reveal']], inDays(20)),
  order('o7', 'c2', 'consegnato', thisMonth(dayOfMonth - 5), [['p2', 1]]),
  order('o8', 'c3', 'consegnato', Date.now() - 35 * DAY, [['p1', 10], ['p3', 4]]),
  order('o9', 'c4', 'consegnato', Date.now() - 50 * DAY, [['p2', 2]]),
];

const data: Record<StoreName, { id: string }[]> = { customers, materials, products, orders, categories };

export async function demoGetAll(store: StoreName): Promise<unknown[]> {
  return structuredClone(data[store]);
}

export async function demoPut(store: StoreName, value: { id: string }): Promise<void> {
  const list = data[store];
  const i = list.findIndex((x) => x.id === value.id);
  if (i >= 0) list[i] = structuredClone(value);
  else list.push(structuredClone(value));
}

export async function demoRemove(store: StoreName, id: string): Promise<void> {
  data[store] = data[store].filter((x) => x.id !== id);
}
