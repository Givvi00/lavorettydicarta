import { useState } from 'react';
import { Modal, Field, Input, PrimaryButton, SecondaryButton } from '@/components/ui/primitives';
import { useSettings } from '@/hooks/useSettings';
import { ChangelogSheet } from '@/components/WhatsNew';
import { APP_VERSION, CHANGELOG } from '@/data/changelog';
import { BUILD_ID, BUILD_DATE } from '@/utils/build';
import { useSender } from '@/hooks/useSender';

export function SettingsModal({
  open,
  onClose,
  onReplayTour,
}: {
  open: boolean;
  onClose: () => void;
  onReplayTour: () => void;
}) {
  const { rates, setRates } = useSettings();
  const { sender, setSender } = useSender();
  const [senderDraft, setSenderDraft] = useState(sender);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [designRate, setDesignRate] = useState(rates.designRate);
  const [productionRate, setProductionRate] = useState(rates.productionRate);

  return (
    <Modal open={open} onClose={onClose} title="Impostazioni">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setRates({ designRate, productionRate });
          setSender(senderDraft);
          onClose();
        }}
      >
        <p className="text-sm font-semibold text-lc-muted">Tariffe orarie</p>
        <p className="text-sm text-lc-muted">Usate per calcolare il costo del tempo nei prodotti e negli ordini.</p>
        <Field label="Tariffa progettazione (€/ora) — Canva, Cricut Design Space...">
          <Input
            type="number"
            step="0.5"
            value={designRate}
            onChange={(e) => setDesignRate(parseFloat(e.target.value) || 0)}
          />
        </Field>
        <Field label="Tariffa produzione (€/ora) — taglio, assemblaggio...">
          <Input
            type="number"
            step="0.5"
            value={productionRate}
            onChange={(e) => setProductionRate(parseFloat(e.target.value) || 0)}
          />
        </Field>

        <p className="mt-2 text-sm font-semibold text-lc-muted">Mittente sulle etichette di spedizione</p>
        <p className="text-sm text-lc-muted">Compare in alto sull'etichetta A5. Se lo cambi, resta su questo dispositivo.</p>
        <Field label="Nome o attività">
          <Input value={senderDraft.name} onChange={(e) => setSenderDraft({ ...senderDraft, name: e.target.value })} placeholder="Lavoretty di Carta" />
        </Field>
        <Field label="Via e numero civico">
          <Input value={senderDraft.street} onChange={(e) => setSenderDraft({ ...senderDraft, street: e.target.value })} autoComplete="off" />
        </Field>
        <div className="grid grid-cols-[6.5rem_1fr_4.5rem] gap-3">
          <Field label="CAP">
            <Input value={senderDraft.zip} onChange={(e) => setSenderDraft({ ...senderDraft, zip: e.target.value })} inputMode="numeric" autoComplete="off" />
          </Field>
          <Field label="Città">
            <Input value={senderDraft.city} onChange={(e) => setSenderDraft({ ...senderDraft, city: e.target.value })} autoComplete="off" />
          </Field>
          <Field label="Prov.">
            <Input value={senderDraft.province} onChange={(e) => setSenderDraft({ ...senderDraft, province: e.target.value.slice(0, 2) })} autoComplete="off" />
          </Field>
        </div>

        <p className="mt-2 text-sm font-semibold text-lc-muted">Guida</p>
        <SecondaryButton type="button" onClick={onReplayTour}>
          Rivedi il tour guidato
        </SecondaryButton>
        <SecondaryButton type="button" onClick={() => setChangelogOpen(true)}>
          Novità · versione {APP_VERSION}
        </SecondaryButton>
        {changelogOpen && (
          <ChangelogSheet entries={CHANGELOG} title="Tutte le novità" onClose={() => setChangelogOpen(false)} />
        )}

        <p className="mt-1 select-all text-center text-xs font-semibold text-lc-muted">
          Versione {APP_VERSION} · deploy <span className="font-mono">{BUILD_ID}</span> · {BUILD_DATE}
        </p>

        <div className="mt-2 flex items-center justify-end">
          <PrimaryButton type="submit">Salva</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
