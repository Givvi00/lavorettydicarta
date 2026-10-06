import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { Customer, Material, Product, Order, Category } from '../types';

const DB_NAME = 'lavorettydicarta';
const DB_VERSION = 2;

interface LcDB extends DBSchema {
  customers: { key: string; value: Customer; indexes: { 'by-name': string } };
  materials: { key: string; value: Material; indexes: { 'by-name': string } };
  products: { key: string; value: Product; indexes: { 'by-name': string } };
  orders: { key: string; value: Order; indexes: { 'by-status': string; 'by-customer': string } };
  categories: { key: string; value: Category; indexes: { 'by-name': string } };
}

type StoreName = 'customers' | 'materials' | 'products' | 'orders' | 'categories';

let dbPromise: Promise<IDBPDatabase<LcDB>> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<LcDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const customers = db.createObjectStore('customers', { keyPath: 'id' });
          customers.createIndex('by-name', 'name');

          const materials = db.createObjectStore('materials', { keyPath: 'id' });
          materials.createIndex('by-name', 'name');

          const products = db.createObjectStore('products', { keyPath: 'id' });
          products.createIndex('by-name', 'name');

          const orders = db.createObjectStore('orders', { keyPath: 'id' });
          orders.createIndex('by-status', 'status');
          orders.createIndex('by-customer', 'customerId');
        }
        if (oldVersion < 2) {
          const categories = db.createObjectStore('categories', { keyPath: 'id' });
          categories.createIndex('by-name', 'name');
        }
      },
    });
  }
  return dbPromise;
}

export async function getAll<T extends StoreName>(store: T): Promise<LcDB[T]['value'][]> {
  const db = await getDb();
  return db.getAll(store);
}

export async function put<T extends StoreName>(store: T, value: LcDB[T]['value']): Promise<void> {
  const db = await getDb();
  await db.put(store, value);
}

export async function remove<T extends StoreName>(store: T, id: string): Promise<void> {
  const db = await getDb();
  await db.delete(store, id);
}

export async function exportAll() {
  const [customers, materials, products, orders, categories] = await Promise.all([
    getAll('customers'),
    getAll('materials'),
    getAll('products'),
    getAll('orders'),
    getAll('categories'),
  ]);
  return { customers, materials, products, orders, categories, exportedAt: Date.now() };
}

export async function importAll(data: {
  customers: Customer[];
  materials: Material[];
  products: Product[];
  orders: Order[];
  categories?: Category[];
}) {
  const db = await getDb();
  const tx = db.transaction(['customers', 'materials', 'products', 'orders', 'categories'], 'readwrite');
  await Promise.all([
    ...data.customers.map((c) => tx.objectStore('customers').put(c)),
    ...data.materials.map((m) => tx.objectStore('materials').put(m)),
    ...data.products.map((p) => tx.objectStore('products').put(p)),
    ...data.orders.map((o) => tx.objectStore('orders').put(o)),
    ...(data.categories ?? []).map((c) => tx.objectStore('categories').put(c)),
  ]);
  await tx.done;
}
