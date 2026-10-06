import { useEffect, useState } from 'react';

export interface Rates {
  designRate: number; // tariffa oraria di progettazione (Canva, Cricut Design Space...)
  productionRate: number; // tariffa oraria di produzione/assemblaggio
}

const KEY = 'lc-rates';
const DEFAULT_RATES: Rates = { designRate: 20, productionRate: 15 };

function getInitial(): Rates {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return { ...DEFAULT_RATES, ...JSON.parse(saved) };
  } catch {
    // ignora, usa i default
  }
  return DEFAULT_RATES;
}

export function useSettings() {
  const [rates, setRates] = useState<Rates>(getInitial);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(rates));
    } catch {
      // preferenza persa solo per questa sessione
    }
  }, [rates]);

  return { rates, setRates };
}
