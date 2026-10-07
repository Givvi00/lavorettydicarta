import { getSecret } from './secrets';

export interface ReceiptLine {
  rawText: string; // testo così come appare sullo scontrino
  name: string; // nome interpretato/esteso dall'AI
  quantity: number;
  unitPrice?: number;
}

// Modello Llama con visione ospitato su Groq (piano gratuito, nessuna carta richiesta).
// Il precedente (llama-3.2-90b-vision-preview) è stato dismesso da Groq.
const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const PROMPT = `Questo è uno scontrino di un negozio (es. Action, Amazon, cartoleria). Estrai ogni riga di prodotto acquistato.
Per ogni riga capisci cosa potrebbe essere l'oggetto reale anche se sullo scontrino è scritto in modo abbreviato
(es. "CARTA A4 80G" potrebbe essere "Cartoncino bianco A4"). Ignora righe di totale, sconto, IVA, resto, metodo di pagamento.
Rispondi SOLO con un array JSON valido, senza markdown, senza testo prima o dopo, in questo formato esatto:
[{"rawText": "testo originale sullo scontrino", "name": "nome interpretato del prodotto", "quantity": numero, "unitPrice": numero_o_null}]`;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
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

  const dataUrl = await fileToDataUrl(file);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
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
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Nessuna risposta ricevuta: prova con una foto più nitida.');

  let parsed: unknown;
  try {
    parsed = extractJsonArray(text);
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
