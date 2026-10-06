import { useState } from 'react';
import { Users2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Card, PrimaryButton, SecondaryButton, DangerButton, Modal, Field, Input, Textarea, EmptyState } from '@/components/ui/primitives';
import type { Customer } from '@/types';

export function Clienti() {
  const { customers, upsertCustomer, deleteCustomer } = useStore();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex animate-slide-up flex-col gap-4 p-4 md:gap-5 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold md:text-2xl">Clienti</h1>
        <PrimaryButton onClick={() => setCreating(true)}>+ Nuovo</PrimaryButton>
      </div>

      <Input
        className="md:max-w-xs"
        placeholder="Cerca cliente..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 && (
          <EmptyState icon={<Users2 />} text="Nessun cliente ancora: aggiungi il primo con “+ Nuovo”." />
        )}
        {filtered.map((c) => (
          <Card key={c.id} className="flex cursor-pointer items-center justify-between">
            <div onClick={() => setEditing(c)} className="flex flex-1 items-center gap-3 text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lc-accent/30 font-display font-semibold text-lc-olive">
                {c.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-lc-muted">
                  {[c.phone, c.email].filter(Boolean).join(' · ') || 'Nessun contatto'}
                </p>
              </div>
            </div>
            <SecondaryButton onClick={() => setEditing(c)}>Modifica</SecondaryButton>
          </Card>
        ))}
      </div>

      {creating && (
        <CustomerForm
          open={creating}
          onClose={() => setCreating(false)}
          onSave={async (data) => {
            await upsertCustomer(data);
            setCreating(false);
          }}
        />
      )}

      {editing && (
        <CustomerForm
          open={!!editing}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            await upsertCustomer({ ...data, id: editing.id });
            setEditing(null);
          }}
          onDelete={async () => {
            await deleteCustomer(editing.id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function CustomerForm({
  open,
  onClose,
  onSave,
  onDelete,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Customer>) => void;
  onDelete?: () => void;
  initial?: Customer;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [instagram, setInstagram] = useState(initial?.instagram ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifica cliente' : 'Nuovo cliente'}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onSave({ name: name.trim(), phone, email, instagram, notes });
        }}
      >
        <Field label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <Field label="Telefono">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Instagram">
          <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} />
        </Field>
        <Field label="Note">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </Field>
        <div className="mt-2 flex items-center justify-between">
          {onDelete ? <DangerButton type="button" onClick={onDelete}>Elimina</DangerButton> : <span />}
          <PrimaryButton type="submit">Salva</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
