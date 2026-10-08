// Chiamate condivise a Groq (chat testuale e trascrizione audio), con la stessa gestione
// errori usata ovunque nel sito: chiave assente/non valida, troppe richieste, risposta vuota.
import { getSecret } from './secrets';

export const GROQ_TEXT_MODEL = 'openai/gpt-oss-120b';
export const GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo';

async function getApiKey(): Promise<string> {
  const apiKey = await getSecret('groq_api_key');
  if (!apiKey) throw new Error('Funzione non configurata: avvisa chi gestisce il sito.');
  return apiKey;
}

async function handleErrorResponse(response: Response, context: string): Promise<never> {
  if (response.status === 401 || response.status === 403) {
    throw new Error('Chiave API Groq non valida o scaduta: avvisa chi gestisce il sito.');
  }
  if (response.status === 429) {
    throw new Error('Troppe richieste in poco tempo: riprova tra qualche minuto.');
  }
  const bodyText = await response.text().catch(() => '');
  console.error('Groq error', response.status, bodyText);
  throw new Error(`Errore ${context} (${response.status}), riprova.`);
}

/** Chiede al modello di testo di Groq una risposta a un prompt, ritorna il contenuto grezzo. */
export async function callGroqChat(prompt: string): Promise<string> {
  const apiKey = await getApiKey();
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_TEXT_MODEL,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) await handleErrorResponse(response, 'nell\'interpretare il testo');

  const data = await response.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Nessuna risposta ricevuta, riprova.');
  return content;
}

/** Trascrive un audio (vocale registrato nel browser) in testo tramite Whisper (Groq), in italiano. */
export async function transcribeVoice(audio: Blob): Promise<string> {
  const text = await transcribeAudio(audio);
  if (!text) throw new Error('Non ho capito nulla: prova a registrare di nuovo, parlando con calma.');
  return text;
}

async function transcribeAudio(audio: Blob, filename = 'audio.webm'): Promise<string> {
  const apiKey = await getApiKey();
  const form = new FormData();
  form.append('file', audio, filename);
  form.append('model', GROQ_WHISPER_MODEL);
  form.append('language', 'it');
  form.append('response_format', 'text');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) await handleErrorResponse(response, 'nel trascrivere l\'audio');

  const text = await response.text();
  return text.trim();
}

/** Estrae il primo oggetto JSON presente nel testo, anche se circondato da ```json o altro testo */
export function extractJsonObject(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Risposta non leggibile, riprova.');
  return JSON.parse(match[0]);
}
