-- Indirizzo di spedizione dei clienti (per l'etichetta A6 in PDF).
alter table public.customers add column if not exists shipping_street text;
alter table public.customers add column if not exists shipping_zip text;
alter table public.customers add column if not exists shipping_city text;
alter table public.customers add column if not exists shipping_province text;
alter table public.customers add column if not exists shipping_country text;
