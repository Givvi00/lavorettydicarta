import { useEffect, useState, lazy, Suspense } from 'react';
import { LayoutDashboard, Users, Boxes, Package, ClipboardList, Sun, Moon, Settings, LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';
import { SettingsModal } from '@/components/SettingsModal';
import { OnboardingTour } from '@/components/OnboardingTour';
import { LoginScreen } from '@/pages/LoginScreen';
import { currentAccount, finishGoogle, hasStoredSession, signOut, GOOGLE_RETURN, type Account } from '@/services/account';
import { Dashboard } from '@/pages/Dashboard';
import { Clienti } from '@/pages/Clienti';
import { Materiali } from '@/pages/Materiali';
import logo from '@/assets/logo.png';

const Prodotti = lazy(() => import('@/pages/Prodotti').then((m) => ({ default: m.Prodotti })));
const Ordini = lazy(() => import('@/pages/Ordini').then((m) => ({ default: m.Ordini })));

type Tab = 'dashboard' | 'clienti' | 'materiali' | 'prodotti' | 'ordini';

// Solo in sviluppo locale (?demo): niente login, dati d'esempio (vedi src/dev/demo.ts). Assente nel sito pubblicato.
const DEMO = import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo');

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'ordini', label: 'Ordini', icon: ClipboardList },
  { id: 'prodotti', label: 'Prodotti', icon: Package },
  { id: 'materiali', label: 'Materiali', icon: Boxes },
  { id: 'clienti', label: 'Clienti', icon: Users },
];

function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [account, setAccount] = useState<Account | null | 'loading'>('loading');
  const [tourActive, setTourActive] = useState(false);
  const { ready, load } = useStore();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (DEMO) {
      setAccount({ id: 'demo', email: 'demo@locale' });
    } else if (GOOGLE_RETURN) {
      finishGoogle()
        .then(setAccount)
        .catch(() => setAccount(null));
    } else if (hasStoredSession()) {
      currentAccount()
        .then(setAccount)
        .catch(() => setAccount(null));
    } else {
      setAccount(null);
    }
  }, []);

  useEffect(() => {
    if (account && account !== 'loading') load();
  }, [account, load]);

  useEffect(() => {
    if (!ready || DEMO) return;
    try {
      if (!localStorage.getItem('lc-onboarding-done')) setTourActive(true);
    } catch {
      /* localStorage non disponibile: nessun tour automatico */
    }
  }, [ready]);

  function finishTour() {
    setTourActive(false);
    try {
      localStorage.setItem('lc-onboarding-done', '1');
    } catch {
      /* ignora */
    }
  }

  if (account === 'loading') {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-lc-bg">
        <img src={logo} alt="" className="h-28 w-28 animate-pop-in rounded-blob shadow-soft" />
        <p className="font-display text-lc-muted">Caricamento...</p>
      </div>
    );
  }

  if (!account) {
    return <LoginScreen onSignedIn={setAccount} />;
  }

  if (!ready) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-lc-bg">
        <img src={logo} alt="" className="h-28 w-28 animate-pop-in rounded-blob shadow-soft" />
        <p className="font-display text-lc-muted">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="relative z-[1] flex h-dvh flex-col md:flex-row">
      {/* Sidebar: solo da tablet/desktop in su, come un foglio appoggiato sulla scrivania */}
      <aside className="hidden w-60 shrink-0 flex-col rounded-card border-2 border-lc-border bg-lc-surface/85 shadow-soft backdrop-blur md:m-3 md:mr-0 md:flex">
        <div className="flex items-center gap-3 border-b-2 border-dashed border-lc-border px-4 py-4">
          <img src={logo} alt="Lavoretty di Carta" className="lc-sticker h-11 w-11 rounded-2xl" />
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold">Lavoretty di Carta</p>
            <p className="font-hand text-lg leading-none text-lc-olive">il tuo angolo creativo</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1.5 p-3">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                data-tour={`nav-${id}`}
                onClick={() => setTab(id)}
                className={`flex items-center gap-3 rounded-btn px-3 py-2.5 text-left font-display text-sm font-semibold transition-all ${
                  active
                    ? 'bg-lc-accent text-lc-accent-text shadow-press'
                    : 'text-lc-muted hover:translate-x-0.5 hover:bg-lc-accent/20 hover:text-lc-text'
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.5 : 2} />
                {label}
              </button>
            );
          })}
        </nav>
        <div className="flex flex-col gap-1 border-t-2 border-dashed border-lc-border p-3">
          <button
            data-tour="btn-impostazioni"
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center gap-3 rounded-btn px-3 py-2.5 text-left font-display text-sm font-semibold text-lc-muted transition-colors hover:bg-lc-border/30 hover:text-lc-text"
          >
            <Settings size={19} />
            Impostazioni
          </button>
          <button
            data-tour="btn-tema"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-btn px-3 py-2.5 text-left font-display text-sm font-semibold text-lc-muted transition-colors hover:bg-lc-border/30 hover:text-lc-text"
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            {theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
          </button>
          <button
            onClick={() => signOut().then(() => setAccount(null))}
            className="flex w-full items-center gap-3 rounded-btn px-3 py-2.5 text-left font-display text-sm font-semibold text-lc-muted transition-colors hover:bg-lc-border/30 hover:text-lc-text"
          >
            <LogOut size={19} />
            Esci ({account.email})
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header: solo su mobile, la sidebar lo sostituisce da md in su */}
        <header className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-lc-accent via-lc-accent to-lc-peach px-4 pb-5 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-soft md:hidden">
          <div className="lc-paper-bg pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative flex items-center gap-3">
            <img src={logo} alt="Lavoretty di Carta" className="lc-sticker h-12 w-12 rounded-2xl" />
            <div className="flex-1">
              <h1 className="font-display text-lg font-semibold leading-tight text-lc-accent-ink">
                Lavoretty di Carta
              </h1>
              <p className="font-hand text-lg leading-none text-lc-accent-ink/80">il tuo angolo creativo ✨</p>
            </div>
            <button
              data-tour="btn-impostazioni"
              onClick={() => setSettingsOpen(true)}
              aria-label="Impostazioni"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/10 text-lc-accent-ink transition-transform active:scale-90"
            >
              <Settings size={17} />
            </button>
            <button
              data-tour="btn-tema"
              onClick={toggleTheme}
              aria-label="Cambia tema"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/10 text-lc-accent-ink transition-transform active:scale-90"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        <main className="lc-scroll flex-1 overflow-y-auto pb-28 md:pb-6">
          <div className="mx-auto w-full max-w-6xl">
            <Suspense fallback={<div className="p-4 text-lc-muted">Caricamento...</div>}>
              {tab === 'dashboard' && <Dashboard />}
              {tab === 'clienti' && <Clienti />}
              {tab === 'materiali' && <Materiali />}
              {tab === 'prodotti' && <Prodotti />}
              {tab === 'ordini' && <Ordini />}
            </Suspense>
          </div>
        </main>

        {/* Barra di navigazione fluttuante: solo su mobile */}
        <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 flex gap-1 rounded-blob border-2 border-lc-border bg-lc-surface/85 p-1.5 shadow-soft backdrop-blur md:hidden">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                data-tour={`nav-${id}`}
                onClick={() => setTab(id)}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-[1.1rem] py-1.5 text-[11px] font-bold transition-all active:scale-95 ${
                  active ? 'bg-lc-accent text-lc-accent-text shadow-press' : 'text-lc-muted'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onReplayTour={() => {
          setSettingsOpen(false);
          setTab('dashboard');
          setTourActive(true);
        }}
      />
      <OnboardingTour active={tourActive} onFinish={finishTour} />
    </div>
  );
}

export default App;
