import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Send, Mic, Square, History, SquarePen, Trash2, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useSettings } from '@/hooks/useSettings';
import { askAssistant, SUGGESTED_QUESTIONS } from '@/services/assistant';
import { transcribeVoice } from '@/services/groqClient';
import { newId } from '@/utils/calc';
import type { Chat, ChatMessage } from '@/types';

const MAX_SECONDS = 90;

/** Testo della risposta: elenchi puntati e **grassetto**, niente altro */
function FormattedText({ text }: { text: string }) {
  const bold = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part
    );
  return (
    <div className="flex flex-col gap-1.5">
      {text.split('\n').map((raw, i) => {
        const line = raw.trim();
        if (!line) return null;
        const bullet = line.match(/^[-*•]\s+(.*)/);
        return bullet ? (
          <div key={i} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lc-accent" />
            <span>{bold(bullet[1])}</span>
          </div>
        ) : (
          <p key={i}>{bold(line)}</p>
        );
      })}
    </div>
  );
}

export function AssistantChat({ page, hidden }: { page: string; hidden: boolean }) {
  const { products, materials, orders, chats, upsertChat, deleteChat } = useStore();
  const { rates } = useSettings();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [chatId, setChatId] = useState(() => newId());
  const [createdAt, setCreatedAt] = useState(() => Date.now());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading, open, view]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    },
    []
  );

  function newChat() {
    setChatId(newId());
    setCreatedAt(Date.now());
    setMessages([]);
    setError('');
    setInput('');
    setView('chat');
  }

  function openChat(c: Chat) {
    setChatId(c.id);
    setCreatedAt(c.createdAt);
    setMessages(c.messages);
    setError('');
    setView('chat');
  }

  async function send(textRaw?: string) {
    const text = (textRaw ?? input).trim();
    if (!text || loading) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text, at: Date.now() }];
    setMessages(next);
    setInput('');
    setError('');
    setLoading(true);
    try {
      const reply = await askAssistant(next, { products, materials, orders, rates, page });
      const done: ChatMessage[] = [...next, { role: 'assistant', content: reply, at: Date.now() }];
      setMessages(done);
      const title = done[0].content.length > 42 ? `${done[0].content.slice(0, 42)}…` : done[0].content;
      upsertChat({ id: chatId, title, messages: done, createdAt, updatedAt: Date.now() }).catch((e) =>
        console.warn('Chat non salvata', e)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto, riprova.');
    } finally {
      setLoading(false);
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
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setTranscribing(true);
        try {
          const text = await transcribeVoice(blob);
          setInput((prev) => (prev ? `${prev} ${text}` : text));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Non ho capito, riprova.');
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      let seconds = 0;
      timerRef.current = window.setInterval(() => {
        seconds += 1;
        if (seconds >= MAX_SECONDS) stopRecording();
      }, 1000);
    } catch {
      setError('Non riesco ad accedere al microfono: controlla i permessi del browser, oppure scrivi.');
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recorderRef.current?.stop();
    setRecording(false);
  }

  const fab = !open && !hidden && (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Chiedi all'assistente"
      className="lc-ai-gradient fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full text-lc-accent-text shadow-lift transition-transform active:scale-90 md:bottom-6 md:right-6"
    >
      <span className="lc-ai-ring" />
      <Sparkles size={24} />
    </button>
  );

  const panel = open && (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-lc-bg pt-[env(safe-area-inset-top)] md:inset-auto md:bottom-6 md:right-6 md:h-[min(42rem,calc(100dvh-3rem))] md:w-[26rem] md:rounded-card md:border-2 md:border-lc-border md:pt-0 md:shadow-lift">
      <div className="flex shrink-0 items-center gap-2 border-b-2 border-dashed border-lc-border px-4 py-3">
        <span className="lc-ai-gradient flex h-9 w-9 items-center justify-center rounded-full text-lc-accent-text">
          <Sparkles size={18} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-display font-semibold">Assistente</p>
          <p className="text-xs font-semibold text-lc-muted">Chiedi pure: conosco i tuoi numeri</p>
        </div>
        <button type="button" onClick={newChat} aria-label="Nuova chat" title="Nuova chat" className="flex h-9 w-9 items-center justify-center rounded-full text-lc-muted hover:bg-lc-border/30">
          <SquarePen size={18} />
        </button>
        <button
          type="button"
          onClick={() => setView(view === 'history' ? 'chat' : 'history')}
          aria-label="Chat salvate"
          title="Chat salvate"
          className={`flex h-9 w-9 items-center justify-center rounded-full hover:bg-lc-border/30 ${view === 'history' ? 'bg-lc-accent/30 text-lc-text' : 'text-lc-muted'}`}
        >
          <History size={18} />
        </button>
        <button type="button" onClick={() => setOpen(false)} aria-label="Chiudi" className="flex h-9 w-9 items-center justify-center rounded-full text-lc-muted hover:bg-lc-border/30">
          <X size={20} />
        </button>
      </div>

      {view === 'history' ? (
        <div className="lc-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4">
          <p className="text-sm font-semibold text-lc-muted">Le tue chat</p>
          {chats.length === 0 && <p className="text-sm text-lc-muted">Ancora nessuna chat salvata: falle una domanda.</p>}
          {chats.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-btn border-2 border-lc-border bg-lc-surface p-2.5">
              {confirmDelete === c.id ? (
                <>
                  <span className="min-w-0 flex-1 text-sm font-semibold">Eliminare questa chat?</span>
                  <button type="button" onClick={() => { deleteChat(c.id); setConfirmDelete(null); if (c.id === chatId) newChat(); }} className="rounded-btn bg-lc-danger px-3 py-1.5 text-sm font-semibold text-white">Sì</button>
                  <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-btn border-2 border-lc-border px-3 py-1.5 text-sm font-semibold">No</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => openChat(c)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold">{c.title}</p>
                    <p className="text-xs text-lc-muted">{new Date(c.updatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} · {c.messages.length} messaggi</p>
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(c.id)} aria-label="Elimina chat" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lc-danger hover:bg-lc-danger/10">
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="lc-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-lc-muted">
                  Prezzi, tempi, materiali, ordini: chiedimi quello che vuoi. Ti rispondo guardando i tuoi prodotti e le tue giacenze.
                </p>
                <div className="flex flex-col items-start gap-1.5">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      className="rounded-btn border-2 border-lc-border bg-lc-surface px-3 py-2 text-left text-sm font-semibold transition-colors hover:border-lc-accent"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[88%] rounded-card px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'self-end bg-lc-accent text-lc-accent-text'
                    : 'self-start border-2 border-lc-border bg-lc-surface'
                }`}
              >
                {m.role === 'user' ? <p className="whitespace-pre-wrap">{m.content}</p> : <FormattedText text={m.content} />}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 self-start rounded-card border-2 border-lc-border bg-lc-surface px-3.5 py-2.5 text-sm text-lc-muted">
                <Loader2 size={15} className="animate-spin" /> <span className="lc-ai-shimmer-text font-semibold">Ci penso...</span>
              </div>
            )}
            {error && <p className="rounded-btn border border-lc-danger/30 bg-lc-danger/10 p-2.5 text-sm font-semibold text-lc-danger">{error}</p>}
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 border-t-2 border-dashed border-lc-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 768px)').matches) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder={transcribing ? 'Trascrivo la voce...' : recording ? 'Sto ascoltando...' : 'Scrivi una domanda...'}
                disabled={transcribing}
                className="max-h-28 min-h-[2.75rem] flex-1 resize-none rounded-btn border-2 border-lc-border bg-lc-surface px-3 py-2.5 text-base outline-none focus:border-lc-accent focus:ring-4 focus:ring-lc-accent/25"
              />
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                disabled={transcribing || loading}
                aria-label={recording ? 'Ferma la registrazione' : 'Parla'}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${recording ? 'border-lc-danger bg-lc-danger text-white' : 'border-lc-border text-lc-muted'}`}
              >
                {recording ? <Square size={16} /> : <Mic size={18} />}
              </button>
              <button
                type="button"
                onClick={() => send()}
                disabled={!input.trim() || loading}
                aria-label="Invia"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lc-accent text-lc-accent-text shadow-press disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return createPortal(
    <>
      {fab}
      {panel}
    </>,
    document.body
  );
}
