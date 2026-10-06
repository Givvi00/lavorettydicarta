export type ID = string;

export type ProductType = 'pronto' | 'personalizzabile';

export type OrderStatus =
  | 'preventivo'
  | 'confermato'
  | 'in_lavorazione'
  | 'pronto'
  | 'consegnato'
  | 'annullato';

export interface Customer {
  id: ID;
  name: string;
  phone?: string;
  email?: string;
  instagram?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Material {
  id: ID;
  name: string;
  unit: string; // es. "foglio", "metro", "pz", "ml"
  unitCost: number; // costo di acquisto per unità
  supplier?: string;
  stockQty: number;
  minStock?: number;
  notes?: string;
  packageQty?: number; // pezzi per confezione
  packagePrice?: number; // prezzo di acquisto dell'intera confezione
  photo?: string; // immagine di riferimento, data URL
  purchaseUrl?: string; // link dove acquistarlo (es. Amazon, Cricut store...)
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: ID;
  name: string;
  createdAt: number;
}

export interface BomLine {
  materialId: ID;
  quantity: number; // quantità di materiale per 1 unità di prodotto
}

export interface Product {
  id: ID;
  name: string;
  category?: string;
  type: ProductType;
  salePrice: number;
  laborCost?: number; // costo manodopera/tempo stimato per unità
  description?: string;
  active: boolean;
  bom: BomLine[]; // distinta base
  createdAt: number;
  updatedAt: number;
}

export interface OrderItem {
  id: ID;
  productId: ID;
  productName: string; // snapshot al momento dell'ordine
  quantity: number;
  unitPrice: number;
  customization?: string;
}

export interface Order {
  id: ID;
  customerId: ID;
  status: OrderStatus;
  items: OrderItem[];
  discount: number; // valore assoluto scontato sul totale
  deliveryDate?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
