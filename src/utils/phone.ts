export function toWhatsAppLink(phone?: string): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/[^\d]/g, '');
  if (digits.length < 6) return null;

  if (!hasPlus) {
    // Numero italiano senza prefisso internazionale (es. cellulare che inizia con 3, o fisso a 9-10 cifre)
    if (digits.startsWith('39') && digits.length > 10) {
      // già nel formato 39XXXXXXXXXX
    } else if (digits.startsWith('0039')) {
      digits = digits.slice(2);
    } else {
      digits = `39${digits}`;
    }
  }

  return `https://wa.me/${digits}`;
}
