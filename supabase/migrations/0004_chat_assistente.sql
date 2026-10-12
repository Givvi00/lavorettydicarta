-- Conversazioni con l'assistente AI (una riga per chat, i messaggi stanno in un jsonb).
create table if not exists chats (
  id text primary key,
  title text not null,
  messages jsonb not null default '[]',
  created_at bigint not null,
  updated_at bigint not null
);

alter table chats enable row level security;
create policy "authenticated full access" on chats for all to authenticated using (true) with check (true);
