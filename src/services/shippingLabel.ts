// Etichetta di spedizione in PDF, formato A6 verticale (105 × 148 mm). jsPDF si carica solo quando serve.
import type { Customer } from '@/types';

export interface Sender {
  name: string;
  street: string;
  zip: string;
  city: string;
  province: string;
}

// Mittente stampato sull'etichetta (modificabile da Impostazioni)
export const DEFAULT_SENDER: Sender = {
  name: 'Gabriele Vitale',
  street: 'Via Donizetti 28',
  zip: '51039',
  city: 'Quarrata',
  province: 'PT',
};

type Recipient = Pick<Customer, 'name' | 'shippingStreet' | 'shippingZip' | 'shippingCity' | 'shippingProvince' | 'shippingCountry'>;

/** Un indirizzo è utilizzabile per l'etichetta se ci sono nome, via, CAP e città */
export function hasShippingAddress(c: Recipient): boolean {
  return !!(c.name.trim() && c.shippingStreet?.trim() && c.shippingZip?.trim() && c.shippingCity?.trim());
}

const PAGE_W = 105;
const PAGE_H = 148;
const MARGIN = 9;
const BANNER_H = 22;

function cityLine(zip?: string, city?: string, province?: string): string {
  const prov = province?.trim() ? ` (${province.trim().toUpperCase()})` : '';
  return `${zip?.trim() ?? ''} ${city?.trim() ?? ''}${prov}`.trim();
}

export async function downloadShippingLabel(recipient: Recipient, sender: Sender = DEFAULT_SENDER): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a6', orientation: 'portrait' });
  const innerW = PAGE_W - MARGIN * 2;
  let y = MARGIN + 1;

  // cornice
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.roundedRect(5, 5, PAGE_W - 10, PAGE_H - 10, 3, 3);

  // mittente (piccolo, in alto)
  const senderLines = [sender.name, sender.street, cityLine(sender.zip, sender.city, sender.province)]
    .map((l) => l.trim())
    .filter(Boolean);
  if (senderLines.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(110);
    doc.text('MITTENTE', MARGIN, y + 2);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0);
    for (const line of senderLines) {
      for (const part of doc.splitTextToSize(line, innerW) as string[]) {
        doc.text(part, MARGIN, y + 2);
        y += 4.2;
      }
    }
    y += 3;
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    doc.setLineDashPattern([], 0);
    y += 8;
  } else {
    y += 6;
  }

  // destinatario (grande)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text('DESTINATARIO', MARGIN, y);
  y += 9;
  doc.setTextColor(0);

  // il nome si rimpicciolisce finché sta in al massimo due righe
  let nameSize = 22;
  let nameLines = doc.setFontSize(nameSize).splitTextToSize(recipient.name.trim(), innerW) as string[];
  while (nameLines.length > 2 && nameSize > 13) {
    nameSize -= 1;
    nameLines = doc.setFontSize(nameSize).splitTextToSize(recipient.name.trim(), innerW) as string[];
  }
  for (const line of nameLines) {
    doc.text(line, MARGIN, y);
    y += nameSize * 0.42;
  }
  y += 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  for (const part of doc.splitTextToSize(recipient.shippingStreet?.trim() ?? '', innerW) as string[]) {
    doc.text(part, MARGIN, y);
    y += 6.5;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  for (const part of doc.splitTextToSize(cityLine(recipient.shippingZip, recipient.shippingCity, recipient.shippingProvince), innerW) as string[]) {
    doc.text(part, MARGIN, y);
    y += 7;
  }
  const country = recipient.shippingCountry?.trim();
  if (country && !/^(italia|italy|it)$/i.test(country)) {
    doc.setFontSize(13);
    doc.text(country.toUpperCase(), MARGIN, y);
  }

  // fascia FRAGILE in fondo: nera, con il bicchiere rotto e la scritta grande
  const bx = MARGIN - 2;
  const bw = PAGE_W - (MARGIN - 2) * 2;
  const by = PAGE_H - 5 - 4 - BANNER_H;
  doc.setFillColor(0, 0, 0);
  doc.roundedRect(bx, by, bw, BANNER_H, 2.5, 2.5, 'F');

  // simbolo: calice con una crepa
  const gx = bx + 11;
  const gy = by + 4.5;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.9);
  doc.triangle(gx - 6, gy, gx + 6, gy, gx, gy + 9.5, 'F');
  doc.line(gx, gy + 9.5, gx, gy + 15.5);
  doc.line(gx - 4, gy + 15.5, gx + 4, gy + 15.5);
  doc.setDrawColor(0);
  doc.setLineWidth(0.6);
  doc.lines([[2, 2.4], [-3, 2.2], [2.2, 2.6]], gx - 1.2, gy + 0.4, [1, 1], 'S');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.text('FRAGILE', bx + 21, by + BANNER_H / 2 + 5.4);

  const slug = recipient.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  doc.save(`etichetta-${slug || 'spedizione'}.pdf`);
}
