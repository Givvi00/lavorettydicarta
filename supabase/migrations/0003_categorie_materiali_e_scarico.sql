-- Categoria dei materiali, ordini regalo e scarico automatico delle giacenze.
alter table public.materials add column if not exists category text;
alter table public.orders add column if not exists is_gift boolean not null default false;
alter table public.orders add column if not exists consumed jsonb;
