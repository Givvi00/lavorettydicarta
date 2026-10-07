// Accesso con Google, riservato a due account whitelisted (vedi ALLOWED_EMAILS).
// La libreria Supabase si carica solo quando serve, così l'app resta leggera per chi non ha ancora effettuato l'accesso.
import type { SupabaseClient } from '@supabase/supabase-js';

// TODO: incollare qui URL e anon key del progetto Supabase creato per Lavoretty di Carta.
// Pubblici per design (come in mcdonaldz-tracker): a proteggere i dati sono le regole RLS, non la segretezza di questi valori.
const SUPABASE_URL = 'PENDING_SETUP';
const SUPABASE_KEY = 'PENDING_SETUP';
const SESSION_KEY = 'lc-auth';

// Le uniche due persone che possono entrare nell'app. Chiunque altro fa login con Google ma viene
// subito disconnesso: la vera barriera però sta nella Google Cloud Console (OAuth consent screen in
// modalità "Testing" con solo questi due indirizzi come test user) — Google stesso rifiuta gli altri.
const ALLOWED_EMAILS = ['vitale.gabriele24@gmail.com'];

let clientPromise: Promise<SupabaseClient> | null = null;

export function getClient(): Promise<SupabaseClient> {
  clientPromise ??= import('@supabase/supabase-js')
    .then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { storageKey: SESSION_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
      }),
    )
    .catch((error) => {
      clientPromise = null;
      throw error;
    });
  return clientPromise;
}

export function hasStoredSession(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) !== null;
  } catch {
    return false;
  }
}

export interface Account {
  id: string;
  email: string;
}

type AuthUser = { id: string; email?: string };

function toAccount(user: AuthUser): Account {
  return { id: user.id, email: user.email ?? '' };
}

export function isAllowed(email: string): boolean {
  return ALLOWED_EMAILS.includes(email.trim().toLowerCase());
}

export class NotAllowedError extends Error {
  constructor() {
    super('Questo account Google non è autorizzato a entrare in questa app.');
  }
}

export async function currentAccount(): Promise<Account | null> {
  const client = await getClient();
  const { data } = await client.auth.getSession();
  const user = data.session?.user;
  if (!user?.email) return null;
  if (!isAllowed(user.email)) {
    await client.auth.signOut({ scope: 'local' });
    return null;
  }
  return toAccount(user);
}

export async function signOut(): Promise<void> {
  const client = await getClient();
  await client.auth.signOut({ scope: 'local' });
}

// Pulsante ufficiale "Accedi con Google", disegnato dentro il container passato.
const GOOGLE_CLIENT_ID = 'PENDING_SETUP';

type GoogleCredential = { credential: string };
type GoogleIdentity = {
  accounts: {
    id: {
      initialize(options: object): void;
      renderButton(container: HTMLElement, options: object): void;
    };
  };
};

let identityPromise: Promise<GoogleIdentity> | null = null;

function loadGoogleIdentity(): Promise<GoogleIdentity> {
  identityPromise ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      const google = (window as { google?: GoogleIdentity }).google;
      if (google?.accounts?.id) resolve(google);
      else reject(new Error('Google non disponibile'));
    };
    script.onerror = () => reject(new Error('Google non disponibile'));
    document.head.appendChild(script);
  }).catch((error) => {
    identityPromise = null;
    throw error;
  });
  return identityPromise;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function randomNonce(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function showGoogleButton(
  container: HTMLElement,
  onSignedIn: (account: Account) => void,
  onError: (error: Error) => void,
): Promise<void> {
  const google = await loadGoogleIdentity();
  const nonce = randomNonce();
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    nonce: await sha256Hex(nonce),
    ux_mode: 'popup',
    itp_support: true,
    callback: ({ credential }: GoogleCredential) => {
      void getClient()
        .then((client) => client.auth.signInWithIdToken({ provider: 'google', token: credential, nonce }))
        .then(async ({ data, error }) => {
          if (error || !data.user?.email) throw new Error('Accesso con Google non riuscito, riprova.');
          if (!isAllowed(data.user.email)) {
            const client = await getClient();
            await client.auth.signOut({ scope: 'local' });
            throw new NotAllowedError();
          }
          onSignedIn(toAccount(data.user));
        })
        .catch((error: Error) => onError(error));
    },
  });
  container.replaceChildren();
  google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: 'signin_with',
    logo_alignment: 'center',
    locale: 'it',
    width: Math.max(200, Math.min(400, Math.floor(container.clientWidth))),
  });
}

const appUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}`;

/** Riserva: se il pulsante Google non si carica (es. blocchi terze parti in PWA standalone su iOS) */
export async function signInWithGoogle(): Promise<void> {
  const client = await getClient();
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: appUrl(), queryParams: { prompt: 'select_account' } },
  });
  if (error) throw error;
}

export const GOOGLE_RETURN: { code?: string; error?: string } | null = (() => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code') ?? undefined;
  const error = params.get('error_description') ?? params.get('error') ?? undefined;
  if (!code && !error) return null;
  window.history.replaceState(null, '', window.location.pathname);
  return { code, error };
})();

export async function finishGoogle(): Promise<Account> {
  if (!GOOGLE_RETURN?.code) throw new Error('Accesso con Google non riuscito, riprova.');
  const client = await getClient();
  const { data, error } = await client.auth.exchangeCodeForSession(GOOGLE_RETURN.code);
  if (error || !data.user?.email) throw new Error('Accesso con Google non riuscito, riprova.');
  if (!isAllowed(data.user.email)) {
    await client.auth.signOut({ scope: 'local' });
    throw new NotAllowedError();
  }
  return toAccount(data.user);
}
