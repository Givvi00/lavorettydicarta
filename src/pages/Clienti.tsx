import { useState } from 'react';
import { Users2, MessageCircle, FileText, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Card, PrimaryButton, SecondaryButton, DangerButton, Modal, Field, Input, Textarea, EmptyState } from '@/components/ui/primitives';
import { PageBar } from '@/components/ui/PageBar';
import { toWhatsAppLink } from '@/utils/phone';
import { useSender } from '@/hooks/useSender';
import { downloadShippingLabel, hasShippingAddress } from '@/services/shippingLabel';
import type { Customer } from '@/types';

export function Clienti() {
  const { customers, upsertCustomer, deleteCustomer } = useStore();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex animate-slide-up flex-col gap-4 p-4 md:gap-5 md:p-8">
      <PageBar
        title={<span className="lc-marker">Clienti</span>}
        actions={
          <PrimaryButton data-tour="btn-nuovo" onClick={() => setCreating(true)}>
            + Nuovo
          </PrimaryButton>
        }
        filters={
          <Input
            className="w-full md:max-w-xs"
            placeholder="Cerca cliente..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 && (
          <EmptyState icon={<Users2 />} text="Nessun cliente ancora: aggiungi il primo con “+ Nuovo”." />
        )}
        {filtered.map((c) => {
          const wa = toWhatsAppLink(c.phone);
          return (
            <Card key={c.id} lift className="flex items-center justify-between gap-2">
              <div onClick={() => setEditing(c)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lc-accent/30 font-display font-semibold text-lc-olive">
                  {c.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">{c.name}</p>
                  <p className="break-words text-sm text-lc-muted">
                    {[c.phone, c.email].filter(Boolean).join(' · ') || 'Nessun contatto'}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Apri chat WhatsApp"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-lc-success/15 text-lc-success transition-transform active:scale-90"
                  >
                    <MessageCircle size={18} />
                  </a>
                )}
                <SecondaryButton onClick={() => setEditing(c)}>Modifica</SecondaryButton>
              </div>
            </Card>
          );
        })}
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

export function CustomerForm({
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
  initial?: Partial<Customer>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [instagram, setInstagram] = useState(initial?.instagram ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [street, setStreet] = useState(initial?.shippingStreet ?? '');
  const [zip, setZip] = useState(initial?.shippingZip ?? '');
  const [city, setCity] = useState(initial?.shippingCity ?? '');
  const [province, setProvince] = useState(initial?.shippingProvince ?? '');
  const [country, setCountry] = useState(initial?.shippingCountry ?? '');
  const [makingLabel, setMakingLabel] = useState(false);
  const [labelError, setLabelError] = useState('');
  const { sender } = useSender();

  const wa = toWhatsAppLink(phone);
  const recipient = { name, shippingStreet: street, shippingZip: zip, shippingCity: city, shippingProvince: province, shippingCountry: country };
  const canLabel = hasShippingAddress(recipient);

  async function makeLabel() {
    setMakingLabel(true);
    setLabelError('');
    try {
      await downloadShippingLabel(recipient, sender);
    } catch (err) {
      console.error(err);
      setLabelError('Non sono riuscito a creare il PDF, riprova.');
    } finally {
      setMakingLabel(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifica cliente' : 'Nuovo cliente'}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onSave({
            name: name.trim(),
            phone,
            email,
            instagram,
            notes,
            shippingStreet: street.trim(),
            shippingZip: zip.trim(),
            shippingCity: city.trim(),
            shippingProvince: province.trim(),
            shippingCountry: country.trim(),
          });
        }}
      >
        <Field label="Nome">
          {/* niente autoFocus: da telefono la tastiera non deve aprirsi da sola */}
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Telefono">
          <div className="flex gap-2">
            <Input
              className="flex-1"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="es. 333 1234567"
            />
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-1.5 rounded-btn border-2 border-lc-success/30 bg-lc-success/15 px-3 text-sm font-semibold text-lc-success transition-transform active:scale-95"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
          </div>
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Instagram">
          <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} />
        </Field>
        <div className="flex flex-col gap-3 rounded-card border-2 border-lc-border bg-lc-surface p-3">
          <p className="font-display font-semibold">Indirizzo di spedizione</p>
          <Field label="Via e numero civico">
            <Input value={street} onChange={(e) => setStreet(e.target.value)} autoComplete="off" placeholder="es. Via Roma 12, interno 3" />
          </Field>
          <div className="grid grid-cols-[6.5rem_1fr] gap-3">
            <Field label="CAP">
              <Input value={zip} onChange={(e) => setZip(e.target.value)} inputMode="numeric" autoComplete="off" />
            </Field>
            <Field label="Città">
              <Input value={city} onChange={(e) => setCity(e.target.value)} autoComplete="off" />
            </Field>
          </div>
          <div className="grid grid-cols-[6.5rem_1fr] gap-3">
            <Field label="Provincia">
              <Input value={province} onChange={(e) => setProvince(e.target.value.slice(0, 2))} placeholder="es. MI" autoComplete="off" />
            </Field>
            <Field label="Nazione (se non Italia)">
              <Input value={country} onChange={(e) => setCountry(e.target.value)} autoComplete="off" />
            </Field>
          </div>
          <SecondaryButton type="button" onClick={makeLabel} disabled={!canLabel || makingLabel}>
            {makingLabel ? <Loader2 size={16} className="mr-1 inline -mt-0.5 animate-spin" /> : <FileText size={16} className="mr-1 inline -mt-0.5" />}
            Etichetta di spedizione A5 (PDF)
          </SecondaryButton>
          {!canLabel && <p className="text-xs font-semibold text-lc-muted">Per l'etichetta servono nome, via, CAP e città.</p>}
          {labelError && <p className="text-xs font-semibold text-lc-danger">{labelError}</p>}
        </div>
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
