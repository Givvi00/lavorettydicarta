import type { Material, Product, Order } from '@/types';

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
