import { getGeminiKey } from './secrets';

export interface ReceiptLine {
  rawText: string; // testo così come appare sullo scontrino
  name: string; // nome interpretato/esteso dall'AI
  quantity: number;
  unitPrice?: number;
}

// "gemini-flash-latest" punterebbe ai modelli 3.x, che Google richiede a pagamento (errore 402
// "credito prepagato esaurito" anche con fatturazione mai attivata). La serie 2.5 resta invece
// gratuita con supporto immagini, quindi la usiamo esplicitamente.
const MODEL = 'gemini-2.5-flash';

const PROMPT = `Questo è uno scontrino di un negozio (es. Action, Amazon, cartoleria). Estrai ogni riga di prodotto acquistato.
Per ogni riga capisci cosa potrebbe essere l'oggetto reale anche se sullo scontrino è scritto in modo abbreviato
(es. "CARTA A4 80G" potrebbe essere "Cartoncino bianco A4"). Ignora righe di totale, sconto, IVA, resto, metodo di pagamento.
Rispondi SOLO con un array JSON valido, senza markdown, in questo formato esatto:
[{"rawText": "testo originale sullo scontrino", "name": "nome interpretato del prodotto", "quantity": numero, "unitPrice": numero_o_null}]`;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
}

export async function readReceipt(file: File): Promise<ReceiptLine[]> {
  const apiKey = await getGeminiKey();
  if (!apiKey) throw new Error('Scanner non configurato: avvisa chi gestisce il sito.');

  const base64 = await fileToBase64(file);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: file.type || 'image/jpeg', data: base64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 400 || response.status === 403) {
      throw new Error('Chiave API Gemini non valida o scaduta: avvisa chi gestisce il sito.');
    }
    if (response.status === 429) {
      throw new Error('Troppe richieste a Gemini in poco tempo: riprova tra qualche minuto.');
    }
    const bodyText = await response.text().catch(() => '');
    console.error('Gemini error', response.status, bodyText);
    throw new Error(`Errore nel leggere lo scontrino (${response.status}), riprova.`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini non ha restituito nulla: prova con una foto più nitida.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Risposta di Gemini non leggibile: prova con una foto più nitida.');
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
