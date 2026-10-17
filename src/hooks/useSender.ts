import { useEffect, useState } from 'react';
import { DEFAULT_SENDER, type Sender } from '@/services/shippingLabel';

// Dati del mittente stampati sull'etichetta (di base: Gabriele Vitale). Se cambiati, restano sul dispositivo in uso.
const KEY = 'lc-sender';

function getInitial(): Sender {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return { ...DEFAULT_SENDER, ...JSON.parse(saved) };
  } catch {
    // ignora, usa i default
  }
  return DEFAULT_SENDER;
}

export function useSender() {
  const [sender, setSender] = useState<Sender>(getInitial);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(sender));
    } catch {
      // preferenza persa solo per questa sessione
    }
  }, [sender]);

  return { sender, setSender };
}
