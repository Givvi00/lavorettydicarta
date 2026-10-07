import { createWorker } from 'tesseract.js';
import { getSecret } from './secrets';

export interface ReceiptLine {
  rawText: string; // testo così come appare sullo scontrino
  name: string; // nome interpretato, chiaro e descrittivo (es. "Cartoncino blu 300g")
  brand?: string; // marca, se riconoscibile (es. "Fabriano")
  quantity: number;
  unitPrice?: number;
}

export interface ReceiptResult {
  supplier?: string; // negozio in cui è stato fatto l'acquisto (es. "Action"), letto dall'intestazione
  lines: ReceiptLine[];
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
abbreviato o con errori OCR. Per il campo "name" scrivi un nome chiaro, leggibile e il più descrittivo possibile
per chi gestisce un magazzino di cartoleria/hobbistica: includi quando riconoscibili colore, grammatura/peso,
formato o dimensione e tipo di materiale (es. da "CARTA A4 80G BIA" scrivi "Cartoncino bianco A4 80g", da
"PENNARELLI 12PZ ASS" scrivi "Pennarelli colorati set da 12"). Se riconosci una marca/brand (es. Fabriano,
Canson, Cricut, Stabilo...) mettila SOLO nel campo separato "brand", non ripeterla nel "name".
Ignora righe di totale, sconto, IVA, resto, metodo di pagamento, scontrino fiscale.
Nell'intestazione in alto cerca anche il nome del negozio/fornitore presso cui è stato fatto l'acquisto
(es. "Action", "Amazon", "Leroy Merlin"): metti il nome del negozio, pulito e senza indirizzo o altri dati,
nel campo "supplier" (null se non riconoscibile).
Rispondi SOLO con un oggetto JSON valido, senza markdown, senza testo prima o dopo, in questo formato esatto:
{"supplier": "nome_negozio_o_null", "items": [{"rawText": "testo originale della riga", "name": "nome chiaro e descrittivo", "brand": "marca_o_null", "quantity": numero, "unitPrice": numero_o_null}]}`;
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

/** Estrae il primo oggetto JSON presente nel testo, anche se circondato da ```json o altro testo */
function extractJsonObject(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Risposta non leggibile: prova con una foto più nitida.');
  return JSON.parse(match[0]);
}

export async function readReceipt(file: File): Promise<ReceiptResult> {
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
    parsed = extractJsonObject(content);
  } catch {
    throw new Error('Risposta non leggibile: prova con una foto più nitida.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Nessun articolo riconosciuto sullo scontrino.');
  }
  const obj = parsed as Record<string, unknown>;
  const items = Array.isArray(obj.items) ? obj.items : [];
  const supplier =
    obj.supplier && String(obj.supplier).trim() ? String(obj.supplier).trim() : undefined;

  const lines = items
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      rawText: String(item.rawText ?? ''),
      name: String(item.name ?? item.rawText ?? ''),
      brand: item.brand && String(item.brand).trim() ? String(item.brand).trim() : undefined,
      quantity: Number(item.quantity) || 1,
      unitPrice: item.unitPrice != null ? Number(item.unitPrice) || undefined : undefined,
    }))
    .filter((item) => item.name.trim().length > 0);

  return { supplier, lines };
}
