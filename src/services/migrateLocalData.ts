// Trasferisce una tantum i dati già salvati in locale (IndexedDB di questo dispositivo, prima
// che il gestionale usasse Supabase) nel database condiviso, cosi' non si perdono.
import * as localDb from './localDb';
import * as remoteDb from './db';

export interface MigrationResult {
  customers: number;
  categories: number;
  materials: number;
  products: number;
  orders: number;
}

export async function migrateLocalDataToSupabase(): Promise<MigrationResult> {
  const [customers, categories, materials, products, orders] = await Promise.all([
    localDb.getAll('customers'),
    localDb.getAll('categories'),
    localDb.getAll('materials'),
    localDb.getAll('products'),
    localDb.getAll('orders'),
  ]);

  for (const c of customers) await remoteDb.put('customers', c);
  for (const c of categories) await remoteDb.put('categories', c);
  for (const m of materials) await remoteDb.put('materials', m);
  for (const p of products) await remoteDb.put('products', p);
  for (const o of orders) await remoteDb.put('orders', o);

  return {
    customers: customers.length,
    categories: categories.length,
    materials: materials.length,
    products: products.length,
    orders: orders.length,
  };
}
