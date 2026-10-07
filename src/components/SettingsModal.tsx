import { useState } from 'react';
import { Modal, Field, Input, PrimaryButton, SecondaryButton } from '@/components/ui/primitives';
import { useSettings } from '@/hooks/useSettings';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { rates, setRates } = useSettings();
  const [designRate, setDesignRate] = useState(rates.designRate);
  const [productionRate, setProductionRate] = useState(rates.productionRate);

  return (
    <Modal open={open} onClose={onClose} title="Impostazioni">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setRates({ designRate, productionRate });
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

        <div className="mt-2 flex items-center justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Annulla
          </SecondaryButton>
          <PrimaryButton type="submit">Salva</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
