import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Card, PrimaryButton, SecondaryButton, DangerButton, Modal, Field, Input, Textarea } from '@/components/ui/primitives';
import type { Customer } from '@/types';

export function Clienti() {
  const { customers, upsertCustomer, deleteCustomer } = useStore();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clienti</h1>
        <PrimaryButton onClick={() => setCreating(true)}>+ Nuovo</PrimaryButton>
      </div>

      <Input placeholder="Cerca cliente..." value={query} onChange={(e) => setQuery(e.target.value)} />

      <div className="flex flex-col gap-2">
        {filtered.length === 0 && <p className="text-sm text-lc-muted">Nessun cliente trovato.</p>}
        {filtered.map((c) => (
          <Card key={c.id} className="flex cursor-pointer items-center justify-between" >
            <div onClick={() => setEditing(c)} className="flex-1 text-left">
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-lc-muted">
                {[c.phone, c.email].filter(Boolean).join(' · ') || 'Nessun contatto'}
              </p>
            </div>
            <SecondaryButton onClick={() => setEditing(c)}>Modifica</SecondaryButton>
          </Card>
        ))}
      </div>

      <CustomerForm
        open={creating}
        onClose={() => setCreating(false)}
        onSave={async (data) => {
          await upsertCustomer(data);
          setCreating(false);
        }}
      />

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
