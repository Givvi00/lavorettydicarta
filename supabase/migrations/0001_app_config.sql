-- Tabella per piccoli valori di configurazione dell'app (es. chiavi API) che non devono
-- stare nel codice sorgente (repository pubblico). Leggibile solo da utenti autenticati
-- (già filtrati dalla whitelist email lato app), mai scrivibile dal client.
create table if not exists app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table app_config enable row level security;

create policy "authenticated can read app_config"
  on app_config for select
  to authenticated
  using (true);

-- Nessuna policy di insert/update/delete per i client: i valori si inseriscono solo
-- manualmente dal pannello Supabase (Table Editor), con i privilegi del proprietario.
