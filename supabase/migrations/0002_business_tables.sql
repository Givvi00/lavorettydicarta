-- Dati condivisi del gestionale (clienti, materiali, prodotti, ordini, categorie).
-- Prima erano solo nel browser di ogni dispositivo (IndexedDB): da qui in poi vivono
-- nel database, condivisi tra tutti gli account autorizzati.
-- created_at/updated_at restano numeri (millisecondi epoch) per compatibilita' col codice esistente.

create table if not exists customers (
  id text primary key,
  name text not null,
  phone text,
  email text,
  instagram text,
  notes text,
  created_at bigint not null,
  updated_at bigint not null
);

create table if not exists categories (
  id text primary key,
  name text not null,
  created_at bigint not null
);

create table if not exists materials (
  id text primary key,
  name text not null,
  unit text not null default 'pz',
  unit_cost numeric not null default 0,
  supplier text,
  stock_qty numeric not null default 0,
  min_stock numeric,
  notes text,
  package_qty numeric,
  package_price numeric,
  photo text,
  purchase_url text,
  created_at bigint not null,
  updated_at bigint not null
);

create table if not exists products (
  id text primary key,
  name text not null,
  category text,
  type text not null default 'personalizzabile',
  sale_price numeric not null default 0,
  labor_cost numeric,
  production_hours numeric,
  design_hours numeric,
  photo text,
  description text,
  active boolean not null default true,
  bom jsonb not null default '[]',
  created_at bigint not null,
  updated_at bigint not null
);

create table if not exists orders (
  id text primary key,
  customer_id text not null,
  status text not null default 'preventivo',
  items jsonb not null default '[]',
  discount numeric not null default 0,
  delivery_date bigint,
  notes text,
  created_at bigint not null,
  updated_at bigint not null
);

alter table customers enable row level security;
alter table categories enable row level security;
alter table materials enable row level security;
alter table products enable row level security;
alter table orders enable row level security;

-- Stesso criterio gia' usato per app_config: chiunque abbia fatto login puo' leggere e
-- scrivere (la vera barriera di accesso e' la whitelist email lato app + Google OAuth).
create policy "authenticated full access" on customers for all to authenticated using (true) with check (true);
create policy "authenticated full access" on categories for all to authenticated using (true) with check (true);
create policy "authenticated full access" on materials for all to authenticated using (true) with check (true);
create policy "authenticated full access" on products for all to authenticated using (true) with check (true);
create policy "authenticated full access" on orders for all to authenticated using (true) with check (true);
