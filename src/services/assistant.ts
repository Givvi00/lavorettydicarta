// Assistente AI: costruisce il riassunto dei dati di Paola da dare al modello e invia la conversazione.
// Il contesto fisso (ruolo, tono, regole) sta in data/assistantPrompt.ts.
import { ASSISTANT_PROMPT } from '@/data/assistantPrompt';
import { callGroqConversation } from '@/services/groqClient';
import {
  aggregateMaterialShortfalls,
  countsAsRevenue,
  effectiveUnitCost,
  formatEUR,
  marginPctOf,
  materialCostOf,
  orderTotal,
  totalCostOf,
} from '@/utils/calc';
import type { ChatMessage, Material, Order, Product } from '@/types';

const MAX_HISTORY = 14;
const ACTIVE: Order['status'][] = ['preventivo', 'confermato', 'in_lavorazione', 'pronto'];

const STATUS_LABEL: Record<Order['status'], string> = {
  preventivo: 'preventivo',
  confermato: 'confermato',
  in_lavorazione: 'in lavorazione',
  pronto: 'pronto',
  consegnato: 'consegnato',
  annullato: 'annullato',
};

function duration(hours?: number): string {
  if (!hours || hours <= 0) return 'non indicato';
  const t = Math.round(hours * 60);
  return t >= 60 ? `${Math.floor(t / 60)} h${t % 60 ? ` ${t % 60} min` : ''}` : `${t} min`;
}

const round = (n: number) => Math.round(n * 100) / 100;

export interface AssistantData {
  products: Product[];
  materials: Material[];
  orders: Order[];
  rates: { designRate: number; productionRate: number };
  page: string;
}

/** Riassunto compatto di tutto ciò che l'assistente deve sapere. Niente foto e niente nomi dei clienti. */
export function buildDataContext({ products, materials, orders, rates, page }: AssistantData): string {
  const lines: string[] = [];
  lines.push(`Oggi è ${new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`);
  lines.push(`Paola sta guardando la pagina "${page}" dell'app.`);
  lines.push(`TARIFFE ORARIE: progettazione ${rates.designRate} €/h, produzione ${rates.productionRate} €/h.`);

  lines.push(`\nPRODOTTI (${products.length}):`);
  for (const p of products.slice(0, 60)) {
    const cost = totalCostOf(p, materials);
    const bom = p.bom
      .map((l) => {
        const m = materials.find((x) => x.id === l.materialId);
        return m ? `${l.quantity} ${m.unit} ${m.name}` : null;
      })
      .filter(Boolean)
      .join(', ');
    lines.push(
      `- ${p.name} (${[p.category, p.type].filter(Boolean).join(', ')}${p.active ? '' : ', disattivato'}): ` +
        `vendita ${formatEUR(p.salePrice)}, costo ${formatEUR(cost)} (materiali ${formatEUR(materialCostOf(p, materials))}, lavoro ${formatEUR(p.laborCost ?? 0)}), ` +
        `margine ${formatEUR(p.salePrice - cost)} (${Math.round(marginPctOf(p, materials))}%), ` +
        `produzione per pezzo ${duration(p.productionHours)}, progettazione una tantum ${duration(p.designHours)}` +
        (bom ? `; materiali: ${bom}` : '; nessun materiale in distinta')
    );
  }
  if (products.length === 0) lines.push('- nessun prodotto ancora');

  lines.push(`\nMATERIALI (${materials.length}):`);
  for (const m of materials.slice(0, 80)) {
    const pack = m.packageQty && m.packagePrice ? `, confezione da ${m.packageQty} a ${formatEUR(m.packagePrice)}` : '';
    const low = m.minStock != null && m.stockQty <= m.minStock ? ' [SOTTO SCORTA]' : '';
    lines.push(
      `- ${m.name}${m.category ? ` [${m.category}]` : ''}: giacenza ${round(m.stockQty)} ${m.unit}${m.minStock ? ` (avviso sotto ${m.minStock})` : ''}, ` +
        `costo ${formatEUR(effectiveUnitCost(m))}/${m.unit}${pack}${m.supplier ? `, fornitore ${m.supplier}` : ''}${low}`
    );
  }
  if (materials.length === 0) lines.push('- nessun materiale ancora');

  const active = orders.filter((o) => ACTIVE.includes(o.status)).slice(0, 40);
  lines.push(`\nORDINI IN CORSO (${active.length}):`);
  for (const o of active) {
    const items = o.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ');
    lines.push(
      `- ${STATUS_LABEL[o.status]}${o.isGift ? ' (regalo)' : ''}: ${items || 'nessun articolo'}; ` +
        `${o.isGift ? 'non conta negli incassi' : `totale ${formatEUR(orderTotal(o))}`}` +
        (o.deliveryDate ? `; consegna ${new Date(o.deliveryDate).toLocaleDateString('it-IT')}` : '')
    );
  }
  if (active.length === 0) lines.push('- nessuno');

  const revenue = orders.filter(countsAsRevenue);
  const now = new Date();
  const monthRevenue = revenue
    .filter((o) => {
      const d = new Date(o.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, o) => s + orderTotal(o), 0);
  const sold = new Map<string, number>();
  for (const o of revenue) for (const i of o.items) sold.set(i.productName, (sold.get(i.productName) ?? 0) + i.quantity);
  const top = [...sold.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  lines.push(`\nSTATISTICHE: ordini totali ${orders.length}, incasso totale ${formatEUR(revenue.reduce((s, o) => s + orderTotal(o), 0))}, incasso del mese ${formatEUR(monthRevenue)}.`);
  if (top.length > 0) lines.push(`Più venduti: ${top.map(([n, q]) => `${n} (${q} pz)`).join(', ')}.`);

  const shopping = aggregateMaterialShortfalls(orders, products, materials);
  if (shopping.length > 0) {
    lines.push(`\nDA COMPRARE per gli ordini confermati: ${shopping.map((s) => `${s.material.name} (mancano ${round(s.missing)} ${s.material.unit})`).join('; ')}.`);
  }

  return lines.join('\n');
}

/** Invia la conversazione (ultimi messaggi) con prompt fisso + dati aggiornati. */
export async function askAssistant(history: ChatMessage[], data: AssistantData): Promise<string> {
  const system = `${ASSISTANT_PROMPT}\n\nDATI DI PAOLA\n${buildDataContext(data)}`;
  const recent = history.slice(-MAX_HISTORY).map(({ role, content }) => ({ role, content }));
  return callGroqConversation(system, recent);
}

export const SUGGESTED_QUESTIONS = [
  'Quali prodotti hanno il margine più basso?',
  'A quanto dovrei vendere i miei prodotti?',
  'Cosa devo comprare per gli ordini in corso?',
  'Come posso ridurre i tempi di produzione?',
  'Quali materiali mi conviene comprare in confezioni più grandi?',
];
