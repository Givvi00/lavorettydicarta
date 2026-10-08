// Crea una bozza di prodotto a partire da un racconto libero (vocale trascritto o scritto):
// "Faccio portachiavi in feltro, uso 10cm di feltro e un anellino, ci metto 15 minuti..."
import { callGroqChat, extractJsonObject, transcribeAudio as transcribeAudioFile } from './groqClient';

export interface DraftBomLine {
  rawText: string; // nome del materiale come detto/capito, prima dell'abbinamento al magazzino
  quantity: number;
}

export interface ProductDraft {
  name: string;
  description?: string;
  designHours?: number;
  productionHours?: number;
  salePrice?: number;
  bom: DraftBomLine[];
}

function buildPrompt(text: string): string {
  return `Questo è il racconto libero (trascritto da un messaggio vocale o scritto) di chi crea a mano
oggetti di cartoleria/hobbistica, e descrive un nuovo prodotto da aggiungere al catalogo.
Testo:
"""
${text}
"""
Estrai le informazioni per creare la scheda prodotto. Per il campo "name" scrivi un nome breve e chiaro del
prodotto. In "description" riassumi brevemente come si fa, solo se ci sono dettagli utili (altrimenti null).
In "materials" elenca ogni materiale usato per realizzare UN pezzo, con il nome del materiale così come
detto (campo "name") e la quantità numerica usata (campo "quantity", default 1 se non specificata: non
serve l'unità di misura, verrà abbinata dopo al magazzino). In "productionHours" metti le ore di
produzione/assemblaggio per un pezzo se menzionate (converti i minuti in ore, es. 15 minuti = 0.25), altrimenti
null. In "designHours" metti le ore di progettazione del template (una tantum, non per pezzo) se menzionate,
altrimenti null. In "salePrice" metti il prezzo di vendita in euro se viene detto esplicitamente, altrimenti null.
Rispondi SOLO con un oggetto JSON valido, senza markdown, senza testo prima o dopo, in questo formato esatto:
{"name": "nome prodotto", "description": "descrizione_o_null", "materials": [{"name": "nome materiale", "quantity": numero}], "productionHours": numero_o_null, "designHours": numero_o_null, "salePrice": numero_o_null}`;
}

export async function transcribeVoice(audio: Blob): Promise<string> {
  const text = await transcribeAudioFile(audio);
  if (!text) throw new Error('Non ho capito nulla: prova a registrare di nuovo, parlando con calma.');
  return text;
}

export async function extractProductDraft(text: string): Promise<ProductDraft> {
  if (!text.trim()) throw new Error('Racconta prima cosa fai per questo prodotto.');

  const content = await callGroqChat(buildPrompt(text));

  let parsed: unknown;
  try {
    parsed = extractJsonObject(content);
  } catch {
    throw new Error('Non ho capito bene: prova a raccontarlo in un altro modo.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Non ho capito bene: prova a raccontarlo in un altro modo.');
  }
  const obj = parsed as Record<string, unknown>;
  const materials = Array.isArray(obj.materials) ? obj.materials : [];

  const bom = materials
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      rawText: String(item.name ?? ''),
      quantity: Number(item.quantity) || 1,
    }))
    .filter((item) => item.rawText.trim().length > 0);

  const name = obj.name && String(obj.name).trim() ? String(obj.name).trim() : 'Nuovo prodotto';
  const description = obj.description && String(obj.description).trim() ? String(obj.description).trim() : undefined;
  const productionHours = obj.productionHours != null ? Number(obj.productionHours) || undefined : undefined;
  const designHours = obj.designHours != null ? Number(obj.designHours) || undefined : undefined;
  const salePrice = obj.salePrice != null ? Number(obj.salePrice) || undefined : undefined;

  return { name, description, productionHours, designHours, salePrice, bom };
}
