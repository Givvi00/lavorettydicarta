import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square, PlusCircle, Search, Keyboard, Sparkles } from 'lucide-react';
import { Modal, Field, Input, Textarea, PrimaryButton, SecondaryButton, Select, Badge } from '@/components/ui/primitives';
import { useStore } from '@/store/useStore';
import { MaterialForm } from '@/pages/Materiali';
import { transcribeVoice, extractProductDraft, type DraftBomLine } from '@/services/voiceProduct';
import { bestMatch } from '@/utils/similarity';
import type { BomLine } from '@/types';

type Confidence = 'high' | 'medium' | 'low';

interface ReviewRow {
  line: DraftBomLine;
  confidence: Confidence;
  action: 'use' | 'created' | 'skip';
  materialId: string;
  quantity: number;
}

const HIGH_THRESHOLD = 0.5;
const LOW_THRESHOLD = 0.2;
const MAX_SECONDS = 120;

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'Corrispondenza trovata',
  medium: 'Forse corrisponde, verifica',
  low: 'Nessuna corrispondenza',
};
const CONFIDENCE_TONE: Record<Confidence, 'success' | 'accent' | 'danger'> = {
  high: 'success',
  medium: 'accent',
  low: 'danger',
};
const CONFIDENCE_CARD: Record<Confidence, string> = {
  high: 'border-lc-success/40 bg-lc-success/5',
  medium: 'border-lc-accent/60 bg-lc-accent/5',
  low: 'border-lc-danger/40 bg-lc-danger/5',
};

export function CreateProductByVoiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { materials, upsertMaterial, upsertProduct } = useStore();
  const [step, setStep] = useState<'input' | 'loading' | 'review' | 'error'>('input');
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [creatingForRow, setCreatingForRow] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productionHours, setProductionHours] = useState<number | undefined>(undefined);
  const [designHours, setDesignHours] = useState<number | undefined>(undefined);
  const [salePrice, setSalePrice] = useState<number | undefined>(undefined);
  const [rows, setRows] = useState<ReviewRow[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function stopTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        handleAudioReady(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed((s) => {
          if (s + 1 >= MAX_SECONDS) stopRecording();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError('Non riesco ad accedere al microfono: controlla i permessi del browser, oppure scrivi invece di parlare.');
      setStep('error');
    }
  }

  function stopRecording() {
    stopTimer();
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function handleAudioReady(blob: Blob) {
    setStep('loading');
    try {
      const text = await transcribeVoice(blob);
      setTranscript(text);
      await interpret(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto, riprova.');
      setStep('error');
    }
  }

  async function handleTextSubmit() {
    const text = typedText.trim();
    if (!text) return;
    setTranscript(text);
    setStep('loading');
    try {
      await interpret(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto, riprova.');
      setStep('error');
    }
  }

  async function interpret(text: string) {
    const draft = await extractProductDraft(text);
    setName(draft.name);
    setDescription(draft.description ?? '');
    setProductionHours(draft.productionHours);
    setDesignHours(draft.designHours);
    setSalePrice(draft.salePrice);
    setRows(
      draft.bom.map((line) => {
        const match = bestMatch(line.rawText, materials, (m) => m.name, 0);
        const confidence: Confidence =
          match && match.score >= HIGH_THRESHOLD ? 'high' : match && match.score >= LOW_THRESHOLD ? 'medium' : 'low';
        return {
          line,
          confidence,
          action: confidence === 'low' ? 'skip' : 'use',
          materialId: confidence !== 'low' ? (match?.item.id ?? '') : '',
          quantity: line.quantity,
        };
      })
    );
    setStep('review');
  }

  function updateRow(index: number, patch: Partial<ReviewRow>) {
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function confirmAll() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const bom: BomLine[] = rows
        .filter((r) => r.action !== 'skip' && r.materialId)
        .map((r) => ({ materialId: r.materialId, quantity: r.quantity }));
      await upsertProduct({
        name: name.trim(),
        type: 'personalizzabile',
        salePrice: salePrice ?? 0,
        productionHours,
        designHours,
        description: description || undefined,
        active: true,
        bom,
      });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    stopTimer();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    setStep('input');
    setMode('voice');
    setRecording(false);
    setElapsed(0);
    setTypedText('');
    setTranscript('');
    setError('');
    setRows([]);
    setName('');
    setDescription('');
    setProductionHours(undefined);
    setDesignHours(undefined);
    setSalePrice(undefined);
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Crea prodotto raccontandolo"
    >
      {step === 'input' && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          {mode === 'voice' ? (
            <>
              <p className="flex items-center gap-1.5 text-sm text-lc-muted">
                <Sparkles size={15} className="shrink-0 text-lc-pink" /> Racconta cosa fai per questo
                prodotto: i materiali che usi, le quantità e quanto tempo ci metti. Capisco io il resto.
              </p>
              <div className="relative flex h-24 w-24 items-center justify-center">
                {recording && (
                  <>
                    <span className="lc-ai-ring" />
                    <span className="lc-ai-ring" style={{ animationDelay: '0.5s' }} />
                    <span className="lc-ai-ring" style={{ animationDelay: '1s' }} />
                  </>
                )}
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  className={`relative flex h-20 w-20 items-center justify-center rounded-full text-lc-accent-text shadow-press transition-transform active:scale-95 ${
                    recording ? 'bg-lc-danger text-white' : 'lc-ai-gradient'
                  }`}
                  aria-label={recording ? 'Ferma registrazione' : 'Inizia registrazione'}
                >
                  {recording ? <Square size={28} /> : <Mic size={28} />}
                </button>
              </div>
              <p className="text-sm font-semibold text-lc-muted">
                {recording ? `Sto ascoltando... ${elapsed}s` : 'Tocca per iniziare a parlare ✨'}
              </p>
              <button
                type="button"
                onClick={() => setMode('text')}
                className="text-xs font-semibold text-lc-muted underline"
              >
                <Keyboard size={13} className="mr-1 inline -mt-0.5" /> Preferisco scrivere
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-lc-muted">
                Scrivi cosa fai per questo prodotto: i materiali che usi, le quantità e quanto tempo ci metti.
              </p>
              <Textarea
                className="w-full"
                rows={5}
                autoFocus
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder='Es. "Faccio portachiavi in feltro: 10cm di feltro rosa e un anellino, ci metto 15 minuti, lo vendo a 5 euro"'
              />
              <div className="flex w-full items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMode('voice')}
                  className="text-xs font-semibold text-lc-muted underline"
                >
                  <Mic size={13} className="mr-1 inline -mt-0.5" /> Preferisco parlare
                </button>
                <PrimaryButton
                  type="button"
                  onClick={handleTextSubmit}
                  disabled={!typedText.trim()}
                  className="lc-ai-gradient border-transparent"
                >
                  <Sparkles size={15} className="mr-1 inline -mt-0.5" /> Interpreta
                </PrimaryButton>
              </div>
            </>
          )}
        </div>
      )}

      {step === 'loading' && (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full lc-ai-gradient">
            <Loader2 size={24} className="animate-spin text-lc-accent-text" />
          </div>
          <p className="font-display text-sm font-semibold lc-ai-shimmer-text">
            {transcript ? 'Capisco cosa serve per il prodotto...' : 'Ascolto e trascrivo...'}
          </p>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <p className="text-sm text-lc-danger">{error}</p>
          <SecondaryButton onClick={reset}>Riprova</SecondaryButton>
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col gap-3">
          {transcript && (
            <p className="rounded-btn bg-lc-bg p-2 text-xs text-lc-muted">
              Ho capito: <span className="italic">"{transcript}"</span>
            </p>
          )}

          <Field label="Nome prodotto">
            <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prezzo di vendita (€)">
              <Input
                type="number"
                step="0.01"
                value={salePrice ?? 0}
                onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="Ore produzione per pezzo">
              <Input
                type="number"
                step="0.1"
                value={productionHours ?? 0}
                onChange={(e) => setProductionHours(parseFloat(e.target.value) || 0)}
              />
            </Field>
          </div>
          <Field label="Descrizione">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>

          {rows.length > 0 && (
            <>
              <p className="text-sm text-lc-muted">
                Materiali usati —{' '}
                <Badge tone="success">verde</Badge> trovato automaticamente ·{' '}
                <Badge tone="accent">arancione</Badge> verifica tu ·{' '}
                <Badge tone="danger">rosso</Badge> nessuna corrispondenza
              </p>
              <div className="flex flex-col gap-3">
                {rows.map((row, i) => {
                  const matchedMaterial = materials.find((m) => m.id === row.materialId);
                  return (
                    <div key={i} className={`flex flex-col gap-2 rounded-btn border p-2 ${CONFIDENCE_CARD[row.confidence]}`}>
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone={CONFIDENCE_TONE[row.confidence]}>{CONFIDENCE_LABEL[row.confidence]}</Badge>
                        <p className="text-xs text-lc-muted">
                          Detto: <span className="italic">"{row.line.rawText}"</span>
                        </p>
                      </div>

                      {row.action === 'created' ? (
                        <p className="text-sm font-semibold text-lc-success">
                          ✓ Creato: {matchedMaterial?.name ?? row.line.rawText}
                        </p>
                      ) : row.action === 'skip' ? (
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-lc-muted">Non incluso nella distinta base.</p>
                          <SecondaryButton
                            type="button"
                            className="px-2 py-1 text-xs"
                            onClick={() => updateRow(i, { action: 'use' })}
                          >
                            Includi comunque
                          </SecondaryButton>
                        </div>
                      ) : (
                        <>
                          <Field label="Associa a materiale esistente">
                            <div className="flex items-center gap-1.5">
                              <Search size={14} className="shrink-0 text-lc-muted" />
                              <Select
                                className="flex-1"
                                value={row.materialId}
                                onChange={(e) => updateRow(i, { materialId: e.target.value })}
                              >
                                <option value="">Scegli materiale...</option>
                                {materials.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                              </Select>
                            </div>
                          </Field>
                          <Field label="Quantità per pezzo">
                            <Input
                              type="number"
                              step="0.01"
                              value={row.quantity}
                              onChange={(e) => updateRow(i, { quantity: parseFloat(e.target.value) || 0 })}
                              className="w-24"
                            />
                          </Field>
                          <SecondaryButton type="button" className="text-xs" onClick={() => setCreatingForRow(i)}>
                            <PlusCircle size={14} className="mr-1 inline -mt-0.5" /> Crea nuovo materiale
                          </SecondaryButton>
                          <button
                            type="button"
                            onClick={() => updateRow(i, { action: 'skip', materialId: '' })}
                            className="self-end text-xs font-semibold text-lc-muted underline"
                          >
                            Non includerlo
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-2 flex items-center justify-between">
            <SecondaryButton type="button" onClick={reset}>
              Annulla
            </SecondaryButton>
            <PrimaryButton type="button" onClick={confirmAll} disabled={saving || !name.trim()}>
              {saving ? 'Salvo...' : 'Crea prodotto'}
            </PrimaryButton>
          </div>

          {creatingForRow != null && (
            <MaterialForm
              open={true}
              initial={{
                name: rows[creatingForRow].line.rawText,
                unit: 'pz',
              }}
              onClose={() => setCreatingForRow(null)}
              onSave={async (data) => {
                const created = await upsertMaterial(data);
                updateRow(creatingForRow, { action: 'created', materialId: created.id });
                setCreatingForRow(null);
              }}
            />
          )}
        </div>
      )}
    </Modal>
  );
}
