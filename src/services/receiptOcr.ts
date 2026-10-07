import { createWorker } from 'tesseract.js';
import { getSecret } from './secrets';

export interface ReceiptLine {
  rawText: string; // testo così come appare sullo scontrino
  name: string; // nome interpretato/esteso dall'AI
  quantity: number;
  unitPrice?: number;
}

// Modello di solo testo (non visione) ospitato su Groq, gratuito. Il tuo account Groq non ha
// accesso a modelli con visione, quindi il testo viene letto prima con Tesseract (OCR locale,
// gira nel browser) e solo il testo viene poi interpretato dall'AI.
const MODEL = 'openai/gpt-oss-120b';

function buildPrompt(ocrText: string): string {
  return `Questo è il testo estratto via OCR da uno scontrino italiano (può contenere errori di lettura).
Testo:
"""
${ocrText}
"""
Estrai ogni riga di prodotto acquistato. Per ogni riga capisci cosa potrebbe essere l'oggetto reale anche se
abbreviato o con errori OCR (es. "CARTA A4 80G" o "CARTA A480G" potrebbe essere "Cartoncino bianco A4").
Ignora intestazione negozio, righe di totale, sconto, IVA, resto, metodo di pagamento, scontrino fiscale.
Rispondi SOLO con un array JSON valido, senza markdown, senza testo prima o dopo, in questo formato esatto:
[{"rawText": "testo originale della riga", "name": "nome interpretato del prodotto", "quantity": numero, "unitPrice": numero_o_null}]`;
}

async function ocrText(file: File): Promise<string> {
  const worker = await createWorker('ita');
  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    return text;
  } finally {
    await worker.terminate();
  }
}

/** Estrae il primo array JSON presente nel testo, anche se circondato da ```json o altro testo */
function extractJsonArray(text: string): unknown {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Risposta non leggibile: prova con una foto più nitida.');
  return JSON.parse(match[0]);
}

export async function readReceipt(file: File): Promise<ReceiptLine[]> {
  const apiKey = await getSecret('groq_api_key');
  if (!apiKey) throw new Error('Scanner non configurato: avvisa chi gestisce il sito.');

  const text = await ocrText(file);
  if (!text.trim()) {
    throw new Error('Non riesco a leggere testo da questa foto: prova con più luce o più a fuoco.');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      messages: [{ role: 'user', content: buildPrompt(text) }],
    }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Chiave API Groq non valida o scaduta: avvisa chi gestisce il sito.');
    }
    if (response.status === 429) {
      throw new Error('Troppe richieste in poco tempo: riprova tra qualche minuto.');
    }
    const bodyText = await response.text().catch(() => '');
    console.error('Groq error', response.status, bodyText);
    throw new Error(`Errore nel leggere lo scontrino (${response.status}), riprova.`);
  }

  const data = await response.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Nessuna risposta ricevuta: prova con una foto più nitida.');

  let parsed: unknown;
  try {
    parsed = extractJsonArray(content);
  } catch {
    throw new Error('Risposta non leggibile: prova con una foto più nitida.');
  }

  if (!Array.isArray(parsed)) throw new Error('Nessun articolo riconosciuto sullo scontrino.');

  return parsed
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      rawText: String(item.rawText ?? ''),
      name: String(item.name ?? item.rawText ?? ''),
      quantity: Number(item.quantity) || 1,
      unitPrice: item.unitPrice != null ? Number(item.unitPrice) || undefined : undefined,
    }))
    .filter((item) => item.name.trim().length > 0);
}
