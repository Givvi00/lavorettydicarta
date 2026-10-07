import { useEffect, useRef, useState } from 'react';
import {
  showGoogleButton,
  signInWithGoogle,
  type Account,
  NotAllowedError,
} from '@/services/account';
import logo from '@/assets/logo.png';

export function LoginScreen({ onSignedIn }: { onSignedIn: (account: Account) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [buttonFailed, setButtonFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    showGoogleButton(
      containerRef.current,
      (account) => onSignedIn(account),
      (err) => {
        if (err instanceof NotAllowedError) {
          setError('Questo account Google non è autorizzato. Solo gli account invitati possono entrare.');
        } else {
          setButtonFailed(true);
        }
      },
    ).catch(() => setButtonFailed(true));
  }, [onSignedIn]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-6 bg-lc-bg p-6 text-center">
      <img src={logo} alt="Lavoretty di Carta" className="h-24 w-24 rounded-blob shadow-soft" />
      <div>
        <h1 className="font-display text-xl font-semibold">Lavoretty di Carta</h1>
        <p className="text-sm text-lc-muted">Accesso riservato — entra con il tuo account Google.</p>
      </div>

      <div ref={containerRef} />

      {buttonFailed && (
        <button
          onClick={() => signInWithGoogle().catch(() => setError('Accesso non riuscito, riprova.'))}
          className="rounded-blob bg-lc-accent px-5 py-2.5 font-display font-semibold text-lc-accent-text shadow-press"
        >
          Accedi con Google
        </button>
      )}

      {error && <p className="max-w-xs text-sm text-lc-danger">{error}</p>}
    </div>
  );
}
