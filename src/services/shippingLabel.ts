// Etichetta di spedizione in PDF, formato A6 verticale (105 × 148 mm). jsPDF si carica solo quando serve.
import type { Customer } from '@/types';

export interface Sender {
  name: string;
  street: string;
  zip: string;
  city: string;
  province: string;
  phone: string;
}

export const EMPTY_SENDER: Sender = { name: '', street: '', zip: '', city: '', province: '', phone: '' };

type Recipient = Pick<Customer, 'name' | 'phone' | 'shippingStreet' | 'shippingZip' | 'shippingCity' | 'shippingProvince' | 'shippingCountry'>;

/** Un indirizzo è utilizzabile per l'etichetta se ci sono nome, via, CAP e città */
export function hasShippingAddress(c: Recipient): boolean {
  return !!(c.name.trim() && c.shippingStreet?.trim() && c.shippingZip?.trim() && c.shippingCity?.trim());
}

const PAGE_W = 105;
const PAGE_H = 148;
const MARGIN = 9;

function cityLine(zip?: string, city?: string, province?: string): string {
  const prov = province?.trim() ? ` (${province.trim().toUpperCase()})` : '';
  return `${zip?.trim() ?? ''} ${city?.trim() ?? ''}${prov}`.trim();
}

export async function downloadShippingLabel(recipient: Recipient, sender?: Sender): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a6', orientation: 'portrait' });
  const innerW = PAGE_W - MARGIN * 2;
  let y = MARGIN + 1;

  // cornice
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.roundedRect(5, 5, PAGE_W - 10, PAGE_H - 10, 3, 3);

  // mittente (piccolo, in alto) se compilato
  const senderLines = sender
    ? [sender.name, sender.street, cityLine(sender.zip, sender.city, sender.province), sender.phone ? `Tel. ${sender.phone}` : '']
        .map((l) => l.trim())
        .filter(Boolean)
    : [];
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
  let nameSize = 24;
  let nameLines = doc.setFontSize(nameSize).splitTextToSize(recipient.name.trim(), innerW) as string[];
  while (nameLines.length > 2 && nameSize > 13) {
    nameSize -= 1;
    nameLines = doc.setFontSize(nameSize).splitTextToSize(recipient.name.trim(), innerW) as string[];
  }
  for (const line of nameLines) {
    doc.text(line, MARGIN, y);
    y += nameSize * 0.42;
  }
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(15);
  for (const part of doc.splitTextToSize(recipient.shippingStreet?.trim() ?? '', innerW) as string[]) {
    doc.text(part, MARGIN, y);
    y += 7;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  for (const part of doc.splitTextToSize(cityLine(recipient.shippingZip, recipient.shippingCity, recipient.shippingProvince), innerW) as string[]) {
    doc.text(part, MARGIN, y);
    y += 7.5;
  }
  const country = recipient.shippingCountry?.trim();
  if (country && !/^(italia|italy|it)$/i.test(country)) {
    doc.setFontSize(14);
    doc.text(country.toUpperCase(), MARGIN, y);
    y += 7;
  }
  if (recipient.phone?.trim()) {
    y += 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Tel. ${recipient.phone.trim()}`, MARGIN, y);
  }

  // firma discreta in fondo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.text('Fragile: lavoretto fatto a mano', PAGE_W / 2, PAGE_H - 8, { align: 'center' });

  const slug = recipient.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  doc.save(`etichetta-${slug || 'spedizione'}.pdf`);
}
