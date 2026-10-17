import { useEffect, useState } from 'react';
import { EMPTY_SENDER, type Sender } from '@/services/shippingLabel';

// Dati del mittente stampati sull'etichetta. Come le tariffe, restano sul dispositivo in uso.
const KEY = 'lc-sender';

function getInitial(): Sender {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return { ...EMPTY_SENDER, ...JSON.parse(saved) };
  } catch {
    // ignora, usa i default
  }
  return EMPTY_SENDER;
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
