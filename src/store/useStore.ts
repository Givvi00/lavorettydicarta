import { create } from 'zustand';
import * as db from '@/services/db';
import { newId } from '@/utils/calc';
import type { Customer, Material, Product, Order, OrderStatus, Category } from '@/types';

interface LcState {
  ready: boolean;
  customers: Customer[];
  materials: Material[];
  products: Product[];
  orders: Order[];
  categories: Category[];

  load: () => Promise<void>;

  upsertCustomer: (c: Partial<Customer> & { id?: string }) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;

  upsertCategory: (c: Partial<Category> & { id?: string }) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;

  upsertMaterial: (m: Partial<Material> & { id?: string }) => Promise<Material>;
  deleteMaterial: (id: string) => Promise<void>;

  upsertProduct: (p: Partial<Product> & { id?: string }) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;

  upsertOrder: (o: Partial<Order> & { id?: string }) => Promise<Order>;
  deleteOrder: (id: string) => Promise<void>;
  setOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
}

export const useStore = create<LcState>((set, get) => ({
  ready: false,
  customers: [],
  materials: [],
  products: [],
  orders: [],
  categories: [],

  load: async () => {
    const [customers, materials, products, orders, categories] = await Promise.all([
      db.getAll('customers'),
      db.getAll('materials'),
      db.getAll('products'),
      db.getAll('orders'),
      db.getAll('categories'),
    ]);
    set({
      customers: customers.sort((a, b) => a.name.localeCompare(b.name)),
      materials: materials.sort((a, b) => a.name.localeCompare(b.name)),
      products: products.sort((a, b) => a.name.localeCompare(b.name)),
      orders: orders.sort((a, b) => b.createdAt - a.createdAt),
      categories: categories.sort((a, b) => a.name.localeCompare(b.name)),
      ready: true,
    });
  },

  upsertCategory: async (input) => {
    const now = Date.now();
    const existing = input.id ? get().categories.find((c) => c.id === input.id) : undefined;
    const record: Category = {
      id: existing?.id ?? input.id ?? newId(),
      name: input.name ?? existing?.name ?? '',
      createdAt: existing?.createdAt ?? now,
    };
    await db.put('categories', record);
    set((s) => ({
      categories: [...s.categories.filter((c) => c.id !== record.id), record].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    }));
    return record;
  },

  deleteCategory: async (id) => {
    await db.remove('categories', id);
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
  },

  upsertCustomer: async (input) => {
    const now = Date.now();
    const existing = input.id ? get().customers.find((c) => c.id === input.id) : undefined;
    const record: Customer = {
      id: existing?.id ?? input.id ?? newId(),
      name: input.name ?? existing?.name ?? '',
      phone: input.phone ?? existing?.phone,
      email: input.email ?? existing?.email,
      instagram: input.instagram ?? existing?.instagram,
      notes: input.notes ?? existing?.notes,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await db.put('customers', record);
    set((s) => ({
      customers: [...s.customers.filter((c) => c.id !== record.id), record].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    }));
    return record;
  },

  deleteCustomer: async (id) => {
    await db.remove('customers', id);
    set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }));
  },

  upsertMaterial: async (input) => {
    const now = Date.now();
    const existing = input.id ? get().materials.find((m) => m.id === input.id) : undefined;
    const record: Material = {
      id: existing?.id ?? input.id ?? newId(),
      name: input.name ?? existing?.name ?? '',
      unit: input.unit ?? existing?.unit ?? 'pz',
      unitCost: input.unitCost ?? existing?.unitCost ?? 0,
      supplier: input.supplier ?? existing?.supplier,
      stockQty: input.stockQty ?? existing?.stockQty ?? 0,
      minStock: input.minStock ?? existing?.minStock,
      notes: input.notes ?? existing?.notes,
      packageQty: input.packageQty ?? existing?.packageQty,
      packagePrice: input.packagePrice ?? existing?.packagePrice,
      photo: input.photo ?? existing?.photo,
      purchaseUrl: input.purchaseUrl ?? existing?.purchaseUrl,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await db.put('materials', record);
    set((s) => ({
      materials: [...s.materials.filter((m) => m.id !== record.id), record].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    }));
    return record;
  },

  deleteMaterial: async (id) => {
    await db.remove('materials', id);
    set((s) => ({ materials: s.materials.filter((m) => m.id !== id) }));
  },

  upsertProduct: async (input) => {
    const now = Date.now();
    const existing = input.id ? get().products.find((p) => p.id === input.id) : undefined;
    const record: Product = {
      id: existing?.id ?? input.id ?? newId(),
      name: input.name ?? existing?.name ?? '',
      category: input.category ?? existing?.category,
      type: input.type ?? existing?.type ?? 'personalizzabile',
      salePrice: input.salePrice ?? existing?.salePrice ?? 0,
      laborCost: input.laborCost ?? existing?.laborCost,
      photo: input.photo ?? existing?.photo,
      description: input.description ?? existing?.description,
      active: input.active ?? existing?.active ?? true,
      bom: input.bom ?? existing?.bom ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await db.put('products', record);
    set((s) => ({
      products: [...s.products.filter((p) => p.id !== record.id), record].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    }));
    return record;
  },

  deleteProduct: async (id) => {
    await db.remove('products', id);
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
  },

  upsertOrder: async (input) => {
    const now = Date.now();
    const existing = input.id ? get().orders.find((o) => o.id === input.id) : undefined;
    const record: Order = {
      id: existing?.id ?? input.id ?? newId(),
      customerId: input.customerId ?? existing?.customerId ?? '',
      status: input.status ?? existing?.status ?? 'preventivo',
      items: input.items ?? existing?.items ?? [],
      discount: input.discount ?? existing?.discount ?? 0,
      deliveryDate: input.deliveryDate ?? existing?.deliveryDate,
      notes: input.notes ?? existing?.notes,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await db.put('orders', record);
    set((s) => ({
      orders: [...s.orders.filter((o) => o.id !== record.id), record].sort(
        (a, b) => b.createdAt - a.createdAt
      ),
    }));
    return record;
  },

  deleteOrder: async (id) => {
    await db.remove('orders', id);
    set((s) => ({ orders: s.orders.filter((o) => o.id !== id) }));
  },

  setOrderStatus: async (id, status) => {
    const order = get().orders.find((o) => o.id === id);
    if (!order) return;
    await get().upsertOrder({ ...order, status });
  },
}));
