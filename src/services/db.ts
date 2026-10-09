// Dati del gestionale salvati su Supabase (database condiviso), non più solo nel browser:
// così sono persistenti davvero e visibili da chiunque sia autorizzato, su qualsiasi dispositivo.
import { getClient } from './account';
import type { Customer, Material, Product, Order, Category } from '../types';

type StoreName = 'customers' | 'materials' | 'products' | 'orders' | 'categories';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

interface Mapper<T> {
  table: string;
  toDb: (value: T) => Row;
  fromDb: (row: Row) => T;
}

const customers: Mapper<Customer> = {
  table: 'customers',
  toDb: (c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone ?? null,
    email: c.email ?? null,
    instagram: c.instagram ?? null,
    notes: c.notes ?? null,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  }),
  fromDb: (r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone ?? undefined,
    email: r.email ?? undefined,
    instagram: r.instagram ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }),
};

const categories: Mapper<Category> = {
  table: 'categories',
  toDb: (c) => ({ id: c.id, name: c.name, created_at: c.createdAt }),
  fromDb: (r) => ({ id: r.id, name: r.name, createdAt: r.created_at }),
};

const materials: Mapper<Material> = {
  table: 'materials',
  toDb: (m) => ({
    id: m.id,
    name: m.name,
    unit: m.unit,
    unit_cost: m.unitCost,
    supplier: m.supplier ?? null,
    stock_qty: m.stockQty,
    min_stock: m.minStock ?? null,
    notes: m.notes ?? null,
    package_qty: m.packageQty ?? null,
    package_price: m.packagePrice ?? null,
    photo: m.photo ?? null,
    purchase_url: m.purchaseUrl ?? null,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
  }),
  fromDb: (r) => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    unitCost: Number(r.unit_cost),
    supplier: r.supplier ?? undefined,
    stockQty: Number(r.stock_qty),
    minStock: r.min_stock != null ? Number(r.min_stock) : undefined,
    notes: r.notes ?? undefined,
    packageQty: r.package_qty != null ? Number(r.package_qty) : undefined,
    packagePrice: r.package_price != null ? Number(r.package_price) : undefined,
    photo: r.photo ?? undefined,
    purchaseUrl: r.purchase_url ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }),
};

const products: Mapper<Product> = {
  table: 'products',
  toDb: (p) => ({
    id: p.id,
    name: p.name,
    category: p.category ?? null,
    type: p.type,
    sale_price: p.salePrice,
    labor_cost: p.laborCost ?? null,
    production_hours: p.productionHours ?? null,
    design_hours: p.designHours ?? null,
    photo: p.photo ?? null,
    description: p.description ?? null,
    active: p.active,
    bom: p.bom,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }),
  fromDb: (r) => ({
    id: r.id,
    name: r.name,
    category: r.category ?? undefined,
    type: r.type,
    salePrice: Number(r.sale_price),
    laborCost: r.labor_cost != null ? Number(r.labor_cost) : undefined,
    productionHours: r.production_hours != null ? Number(r.production_hours) : undefined,
    designHours: r.design_hours != null ? Number(r.design_hours) : undefined,
    photo: r.photo ?? undefined,
    description: r.description ?? undefined,
    active: r.active,
    bom: r.bom ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }),
};

const orders: Mapper<Order> = {
  table: 'orders',
  toDb: (o) => ({
    id: o.id,
    customer_id: o.customerId,
    status: o.status,
    items: o.items,
    discount: o.discount,
    delivery_date: o.deliveryDate ?? null,
    notes: o.notes ?? null,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
  }),
  fromDb: (r) => ({
    id: r.id,
    customerId: r.customer_id,
    status: r.status,
    items: r.items ?? [],
    discount: Number(r.discount),
    deliveryDate: r.delivery_date ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MAPPERS: Record<StoreName, Mapper<any>> = { customers, materials, products, orders, categories };

type ValueOf<T extends StoreName> = T extends 'customers'
  ? Customer
  : T extends 'materials'
    ? Material
    : T extends 'products'
      ? Product
      : T extends 'orders'
        ? Order
        : Category;

export async function getAll<T extends StoreName>(store: T): Promise<ValueOf<T>[]> {
  const client = await getClient();
  const mapper = MAPPERS[store];
  const { data, error } = await client.from(mapper.table).select('*');
  if (error) throw error;
  return (data ?? []).map(mapper.fromDb);
}

export async function put<T extends StoreName>(store: T, value: ValueOf<T>): Promise<void> {
  const client = await getClient();
  const mapper = MAPPERS[store];
  const { error } = await client.from(mapper.table).upsert(mapper.toDb(value));
  if (error) throw error;
}

export async function remove<T extends StoreName>(store: T, id: string): Promise<void> {
  const client = await getClient();
  const mapper = MAPPERS[store];
  const { error } = await client.from(mapper.table).delete().eq('id', id);
  if (error) throw error;
}
