// Crea una bozza di ordine a partire da un racconto libero (vocale trascritto o scritto):
// "Un ordine per Giulia, due portachiavi con il nome Sofia, consegna entro venerdì".
import { callGroqChat, extractJsonObject } from './groqClient';

export interface DraftOrderItem {
  productName: string; // nome prodotto come detto/capito, prima dell'abbinamento al catalogo
  quantity: number;
  customization?: string;
}

export interface OrderDraft {
  customerName?: string;
  items: DraftOrderItem[];
  deliveryDate?: string; // ISO YYYY-MM-DD
  notes?: string;
}

function buildPrompt(text: string, todayIso: string): string {
  return `Questo è il racconto libero (trascritto da un messaggio vocale o scritto) di chi gestisce un
piccolo laboratorio di cartoleria/hobbistica, e descrive un ordine da registrare.
Oggi è ${todayIso}.
Testo:
"""
${text}
"""
Estrai le informazioni per creare l'ordine. In "customerName" metti il nome del cliente se detto, altrimenti
null. In "items" elenca ogni prodotto ordinato, con il nome del prodotto così come detto (campo "productName"),
la quantità (campo "quantity", default 1 se non specificata) e, se menzionata, una personalizzazione
specifica per quell'articolo come nome da scrivere, colori o data (campo "customization", altrimenti null).
In "deliveryDate" metti la data di consegna in formato ISO YYYY-MM-DD se detta, anche se relativa
(es. "entro venerdì", "tra due settimane": calcolala rispetto a oggi), altrimenti null.
In "notes" metti eventuali altre informazioni utili non già incluse sopra, altrimenti null.
Rispondi SOLO con un oggetto JSON valido, senza markdown, senza testo prima o dopo, in questo formato esatto:
{"customerName": "nome_o_null", "items": [{"productName": "nome prodotto", "quantity": numero, "customization": "testo_o_null"}], "deliveryDate": "YYYY-MM-DD_o_null", "notes": "testo_o_null"}`;
}

export async function extractOrderDraft(text: string): Promise<OrderDraft> {
  if (!text.trim()) throw new Error('Racconta prima i dettagli dell\'ordine.');

  const todayIso = new Date().toISOString().slice(0, 10);
  const content = await callGroqChat(buildPrompt(text, todayIso));

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
  const rawItems = Array.isArray(obj.items) ? obj.items : [];

  const items = rawItems
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      productName: String(item.productName ?? ''),
      quantity: Number(item.quantity) || 1,
      customization:
        item.customization && String(item.customization).trim() ? String(item.customization).trim() : undefined,
    }))
    .filter((item) => item.productName.trim().length > 0);

  const customerName =
    obj.customerName && String(obj.customerName).trim() ? String(obj.customerName).trim() : undefined;
  const notes = obj.notes && String(obj.notes).trim() ? String(obj.notes).trim() : undefined;
  const deliveryDate =
    obj.deliveryDate && /^\d{4}-\d{2}-\d{2}$/.test(String(obj.deliveryDate)) ? String(obj.deliveryDate) : undefined;

  return { customerName, items, deliveryDate, notes };
}
