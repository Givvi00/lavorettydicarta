import { useEffect, useState } from 'react';

const KEY = 'lc-gemini-key';

function getInitial(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function useAIKey() {
  const [geminiKey, setGeminiKey] = useState<string>(getInitial);

  useEffect(() => {
    try {
      if (geminiKey) localStorage.setItem(KEY, geminiKey);
      else localStorage.removeItem(KEY);
    } catch {
      // chiave persa solo per questa sessione
    }
  }, [geminiKey]);

  return { geminiKey, setGeminiKey };
}
