// Piccoli valori di configurazione letti dal database (tabella app_config), non dal codice:
// così restano fuori dal repository pubblico. Leggibili solo da chi ha già fatto login.
import { getClient } from './account';

const cache = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

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

export function getSecret(key: string): Promise<string | null> {
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null);
  if (!pending.has(key)) {
    pending.set(
      key,
      fetchValue(key).then((value) => {
        cache.set(key, value);
        pending.delete(key);
        return value;
      })
    );
  }
  return pending.get(key)!;
}
