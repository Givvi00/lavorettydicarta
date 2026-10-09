import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square, PlusCircle, Search, Keyboard, Sparkles } from 'lucide-react';
import { Modal, Field, Input, Textarea, PrimaryButton, SecondaryButton, Select, Badge } from '@/components/ui/primitives';
import { useStore } from '@/store/useStore';
import { CustomerForm } from '@/pages/Clienti';
import { extractOrderDraft, type DraftOrderItem } from '@/services/voiceOrder';
import { transcribeVoice } from '@/services/groqClient';
import { bestMatch } from '@/utils/similarity';
import { newId } from '@/utils/calc';
import type { OrderItem } from '@/types';

type Confidence = 'high' | 'medium' | 'low';

interface ReviewItem {
  line: DraftOrderItem;
  confidence: Confidence;
  productId: string;
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

export function CreateOrderByVoiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { customers, products, upsertCustomer, upsertOrder } = useStore();
  const [step, setStep] = useState<'input' | 'loading' | 'review' | 'error'>('input');
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [customerConfidence, setCustomerConfidence] = useState<Confidence>('low');
  const [customerNameHeard, setCustomerNameHeard] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReviewItem[]>([]);

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
    const draft = await extractOrderDraft(text);

    if (draft.customerName) {
      const match = bestMatch(draft.customerName, customers, (c) => c.name, 0);
      const confidence: Confidence =
        match && match.score >= HIGH_THRESHOLD ? 'high' : match && match.score >= LOW_THRESHOLD ? 'medium' : 'low';
      setCustomerNameHeard(draft.customerName);
      setCustomerConfidence(confidence);
      setCustomerId(confidence !== 'low' ? (match?.item.id ?? '') : '');
    } else {
      setCustomerNameHeard('');
      setCustomerConfidence('low');
      setCustomerId(customers[0]?.id ?? '');
    }

    setDeliveryDate(draft.deliveryDate ?? '');
    setNotes(draft.notes ?? '');
    setItems(
      draft.items.map((line) => {
        const match = bestMatch(line.productName, products, (p) => p.name, 0);
        const confidence: Confidence =
          match && match.score >= HIGH_THRESHOLD ? 'high' : match && match.score >= LOW_THRESHOLD ? 'medium' : 'low';
        return { line, confidence, productId: confidence !== 'low' ? (match?.item.id ?? '') : '' };
      })
    );
    setStep('review');
  }

  function updateItem(index: number, productId: string) {
    setItems(items.map((it, i) => (i === index ? { ...it, productId } : it)));
  }

  async function confirmAll() {
    if (!customerId) return;
    setSaving(true);
    try {
      const orderItems: OrderItem[] = items
        .filter((it) => it.productId)
        .map((it) => {
          const product = products.find((p) => p.id === it.productId);
          return {
            id: newId(),
            productId: it.productId,
            productName: product?.name ?? it.line.productName,
            quantity: it.line.quantity,
            unitPrice: product?.salePrice ?? 0,
            customization: it.line.customization,
          };
        });
      await upsertOrder({
        customerId,
        status: 'preventivo',
        items: orderItems,
        discount: 0,
        deliveryDate: deliveryDate ? new Date(deliveryDate).getTime() : undefined,
        notes: notes || undefined,
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
    setCustomerId('');
    setCustomerConfidence('low');
    setCustomerNameHeard('');
    setDeliveryDate('');
    setNotes('');
    setItems([]);
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Crea ordine raccontandolo"
      confirmClose={step === 'review' || step === 'loading'}
    >
      {step === 'input' && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          {mode === 'voice' ? (
            <>
              <p className="flex items-center gap-1.5 text-sm text-lc-muted">
                <Sparkles size={15} className="shrink-0 text-lc-pink" /> Racconta l'ordine: per chi è, cosa
                vuole, quante copie, personalizzazioni e quando deve essere pronto.
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
                Scrivi l'ordine: per chi è, cosa vuole, quante copie, personalizzazioni e quando deve essere
                pronto.
              </p>
              <Textarea
                className="w-full"
                rows={5}
                autoFocus
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder='Es. "Ordine per Giulia: due portachiavi con il nome Sofia, consegna entro venerdì"'
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
            {transcript ? "Capisco i dettagli dell'ordine..." : 'Ascolto e trascrivo...'}
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

          <div className={`flex flex-col gap-2 rounded-btn border p-2 ${CONFIDENCE_CARD[customerConfidence]}`}>
            <div className="flex items-center justify-between gap-2">
              <Field label="Cliente">
                <div className="flex items-center gap-1.5">
                  <Search size={14} className="shrink-0 text-lc-muted" />
                  <Select className="flex-1" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                    <option value="">Scegli cliente...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </Field>
              {customerNameHeard && <Badge tone={CONFIDENCE_TONE[customerConfidence]}>{CONFIDENCE_LABEL[customerConfidence]}</Badge>}
            </div>
            {customerNameHeard && (
              <p className="text-xs text-lc-muted">
                Detto: <span className="italic">"{customerNameHeard}"</span>
              </p>
            )}
            {!customerId && (
              <SecondaryButton type="button" className="self-start text-xs" onClick={() => setCreatingCustomer(true)}>
                <PlusCircle size={14} className="mr-1 inline -mt-0.5" /> Crea nuovo cliente
              </SecondaryButton>
            )}
          </div>

          <Field label="Data di consegna">
            <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          </Field>

          {items.length > 0 && (
            <>
              <p className="text-sm text-lc-muted">
                Articoli —{' '}
                <Badge tone="success">verde</Badge> trovato automaticamente ·{' '}
                <Badge tone="accent">arancione</Badge> verifica tu ·{' '}
                <Badge tone="danger">rosso</Badge> nessuna corrispondenza
              </p>
              <div className="flex flex-col gap-3">
                {items.map((it, i) => (
                  <div key={i} className={`flex flex-col gap-2 rounded-btn border p-2 ${CONFIDENCE_CARD[it.confidence]}`}>
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={CONFIDENCE_TONE[it.confidence]}>{CONFIDENCE_LABEL[it.confidence]}</Badge>
                      <p className="text-xs text-lc-muted">
                        Detto: <span className="italic">"{it.line.productName}"</span> × {it.line.quantity}
                      </p>
                    </div>
                    <Field label="Prodotto">
                      <Select value={it.productId} onChange={(e) => updateItem(i, e.target.value)}>
                        <option value="">Scegli prodotto...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    {it.line.customization && (
                      <p className="text-xs text-lc-muted">Personalizzazione: {it.line.customization}</p>
                    )}
                    {it.confidence === 'low' && !it.productId && (
                      <p className="text-xs text-lc-muted">
                        Nessun prodotto simile in catalogo: scegline uno tu, oppure crealo prima da "Racconta"
                        in Prodotti.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <Field label="Note">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </Field>

          <div className="mt-2 flex items-center justify-end">
            <PrimaryButton type="button" onClick={confirmAll} disabled={saving || !customerId}>
              {saving ? 'Salvo...' : 'Crea ordine'}
            </PrimaryButton>
          </div>

          {creatingCustomer && (
            <CustomerForm
              open={true}
              initial={{ name: customerNameHeard }}
              onClose={() => setCreatingCustomer(false)}
              onSave={async (data) => {
                const created = await upsertCustomer(data);
                setCustomerId(created.id);
                setCreatingCustomer(false);
              }}
            />
          )}
        </div>
      )}
    </Modal>
  );
}
