// Piccoli valori di configurazione letti dal database (tabella app_config), non dal codice:
// così restano fuori dal repository pubblico. Leggibili solo da chi ha già fatto login.
import { getClient } from './account';

let cached: string | null = null;
let pending: Promise<string | null> | null = null;

async function fetchValue(key: string): Promise<string | null> {
  try {
    const client = await getClient();
    const { data, error } = await client.from('app_config').select('value').eq('key', key).maybeSingle();
    if (error || !data) return null;
    return (data as { value: string }).value;
  } catch {
    return null;
  }
}

export function getGeminiKey(): Promise<string | null> {
  if (cached) return Promise.resolve(cached);
  pending ??= fetchValue('gemini_api_key').then((value) => {
    cached = value;
    pending = null;
    return value;
  });
  return pending;
}
