import { useState } from 'react';
import { Modal, Field, Input, PrimaryButton, SecondaryButton, Card } from '@/components/ui/primitives';
import { useSettings } from '@/hooks/useSettings';
import { getSecret } from '@/services/secrets';
import { useStore } from '@/store/useStore';
import { migrateLocalDataToSupabase, type MigrationResult } from '@/services/migrateLocalData';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { rates, setRates } = useSettings();
  const { load } = useStore();
  const [designRate, setDesignRate] = useState(rates.designRate);
  const [productionRate, setProductionRate] = useState(rates.productionRate);
  const [groqModels, setGroqModels] = useState<string[] | null>(null);
  const [groqError, setGroqError] = useState('');
  const [checking, setChecking] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [migrationError, setMigrationError] = useState('');

  async function runMigration() {
    setMigrating(true);
    setMigrationError('');
    setMigrationResult(null);
    try {
      const result = await migrateLocalDataToSupabase();
      setMigrationResult(result);
      await load();
    } catch {
      setMigrationError('Errore durante il trasferimento, riprova.');
    } finally {
      setMigrating(false);
    }
  }

  async function checkGroqModels() {
    setChecking(true);
    setGroqError('');
    setGroqModels(null);
    try {
      const key = await getSecret('groq_api_key');
      if (!key) {
        setGroqError('Chiave groq_api_key non trovata in app_config su Supabase.');
        return;
      }
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setGroqError(data?.error?.message ?? `Errore ${res.status}`);
        return;
      }
      const ids: string[] = (data?.data ?? []).map((m: { id: string }) => m.id);
      setGroqModels(ids);
    } catch {
      setGroqError('Errore di rete, riprova.');
    } finally {
      setChecking(false);
    }
  }

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

        <p className="mt-2 text-sm font-semibold text-lc-muted">Dati salvati su questo dispositivo</p>
        <p className="text-sm text-lc-muted">
          Se hai usato l'app prima che i dati fossero condivisi, qui puoi caricare una volta i dati già inseriti
          su questo dispositivo nel database condiviso, cosi' li vedi anche dagli altri account.
        </p>
        <SecondaryButton type="button" onClick={runMigration} disabled={migrating}>
          {migrating ? 'Trasferimento in corso...' : 'Carica i dati di questo dispositivo nel database condiviso'}
        </SecondaryButton>
        {migrationError && <p className="text-sm text-lc-danger">{migrationError}</p>}
        {migrationResult && (
          <p className="text-sm text-lc-success">
            Trasferiti: {migrationResult.customers} clienti, {migrationResult.categories} categorie,{' '}
            {migrationResult.materials} materiali, {migrationResult.products} prodotti, {migrationResult.orders} ordini.
          </p>
        )}

        <p className="mt-2 text-sm font-semibold text-lc-muted">Scanner scontrini (diagnostica)</p>
        <SecondaryButton type="button" onClick={checkGroqModels} disabled={checking}>
          {checking ? 'Controllo...' : 'Verifica modelli Groq disponibili'}
        </SecondaryButton>
        {groqError && <p className="text-sm text-lc-danger">{groqError}</p>}
        {groqModels && (
          <Card className="bg-lc-bg text-left text-xs">
            <p className="mb-1 font-semibold">Modelli disponibili per questa chiave:</p>
            <ul className="flex flex-col gap-0.5">
              {groqModels.map((id) => (
                <li key={id} className="break-all">
                  {id}
                </li>
              ))}
            </ul>
          </Card>
        )}

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
