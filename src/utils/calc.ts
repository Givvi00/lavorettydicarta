import type { Material, Product, Order, OrderItem, OrderStatus } from '@/types';

export function materialCostOf(product: Pick<Product, 'bom'>, materials: Material[]): number {
  return product.bom.reduce((sum, line) => {
    const mat = materials.find((m) => m.id === line.materialId);
    if (!mat) return sum;
    return sum + mat.unitCost * line.quantity;
  }, 0);
}

export function totalCostOf(product: Pick<Product, 'bom' | 'laborCost'>, materials: Material[]): number {
  return materialCostOf(product, materials) + (product.laborCost ?? 0);
}

export function marginOf(product: Pick<Product, 'bom' | 'laborCost' | 'salePrice'>, materials: Material[]): number {
  return product.salePrice - totalCostOf(product, materials);
}

export function marginPctOf(product: Pick<Product, 'bom' | 'laborCost' | 'salePrice'>, materials: Material[]): number {
  if (product.salePrice <= 0) return 0;
  return (marginOf(product, materials) / product.salePrice) * 100;
}

export function orderSubtotal(order: Pick<Order, 'items'>): number {
  return order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function orderTotal(order: Pick<Order, 'items' | 'discount'>): number {
  return Math.max(0, orderSubtotal(order) - (order.discount ?? 0));
}

export function formatEUR(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

export function newId(): string {
  return crypto.randomUUID();
}

export interface MaterialShortfall {
  material: Material;
  needed: number;
  available: number;
  missing: number; // quanto manca, 0 se c'è abbastanza
}

/** Quanto materiale serve in totale per realizzare questi articoli, per materialId */
function materialNeedsFor(items: Pick<OrderItem, 'productId' | 'quantity'>[], products: Product[]): Map<string, number> {
  const needs = new Map<string, number>();
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) continue;
    for (const line of product.bom) {
      needs.set(line.materialId, (needs.get(line.materialId) ?? 0) + line.quantity * item.quantity);
    }
  }
  return needs;
}

/** Disponibilità dei materiali necessari per un insieme di articoli (es. le righe di un ordine) */
export function materialShortfallsFor(
  items: Pick<OrderItem, 'productId' | 'quantity'>[],
  products: Product[],
  materials: Material[]
): MaterialShortfall[] {
  const needs = materialNeedsFor(items, products);
  const result: MaterialShortfall[] = [];
  for (const [materialId, needed] of needs) {
    const material = materials.find((m) => m.id === materialId);
    if (!material) continue;
    result.push({ material, needed, available: material.stockQty, missing: Math.max(0, needed - material.stockQty) });
  }
  return result;
}

// Stati che contano come "lavoro da onorare davvero": i preventivi non sono ancora certi,
// quindi non riservano materiale nella lista della spesa.
const STATUSES_COUNTED_FOR_SHOPPING: OrderStatus[] = ['confermato', 'in_lavorazione', 'pronto'];

/** Materiali mancanti per completare TUTTI gli ordini confermati in corso (non i preventivi) */
export function aggregateMaterialShortfalls(orders: Order[], products: Product[], materials: Material[]): MaterialShortfall[] {
  const items = orders.filter((o) => STATUSES_COUNTED_FOR_SHOPPING.includes(o.status)).flatMap((o) => o.items);
  return materialShortfallsFor(items, products, materials).filter((s) => s.missing > 0);
}
