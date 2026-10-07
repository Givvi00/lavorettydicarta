import { useState } from 'react';
import { Modal, Field, Input, PrimaryButton, SecondaryButton } from '@/components/ui/primitives';
import { useSettings } from '@/hooks/useSettings';
import { useAIKey } from '@/hooks/useAIKey';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { rates, setRates } = useSettings();
  const { geminiKey, setGeminiKey } = useAIKey();
  const [designRate, setDesignRate] = useState(rates.designRate);
  const [productionRate, setProductionRate] = useState(rates.productionRate);
  const [apiKey, setApiKey] = useState(geminiKey);

  return (
    <Modal open={open} onClose={onClose} title="Impostazioni">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setRates({ designRate, productionRate });
          setGeminiKey(apiKey.trim());
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

        <p className="mt-2 text-sm font-semibold text-lc-muted">Scanner scontrini (AI)</p>
        <Field label="Chiave API Google Gemini">
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            autoComplete="off"
          />
        </Field>
        <p className="text-xs text-lc-muted">
          Gratuita su{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-lc-olive underline"
          >
            aistudio.google.com
          </a>
          . Resta salvata solo su questo dispositivo/browser, mai condivisa.
        </p>

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
