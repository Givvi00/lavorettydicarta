import { useEffect, useState, lazy, Suspense } from 'react';
import { LayoutDashboard, Users, Boxes, Package, ClipboardList, Sun, Moon, Settings, LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';
import { SettingsModal } from '@/components/SettingsModal';
import { LoginScreen } from '@/pages/LoginScreen';
import { currentAccount, finishGoogle, hasStoredSession, signOut, GOOGLE_RETURN, type Account } from '@/services/account';
import { Dashboard } from '@/pages/Dashboard';
import { Clienti } from '@/pages/Clienti';
import { Materiali } from '@/pages/Materiali';
import logo from '@/assets/logo.png';

const Prodotti = lazy(() => import('@/pages/Prodotti').then((m) => ({ default: m.Prodotti })));
const Ordini = lazy(() => import('@/pages/Ordini').then((m) => ({ default: m.Ordini })));

type Tab = 'dashboard' | 'clienti' | 'materiali' | 'prodotti' | 'ordini';

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
  const { ready, load } = useStore();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (GOOGLE_RETURN) {
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
    <div className="flex h-dvh flex-col bg-lc-bg md:flex-row">
      {/* Sidebar: solo da tablet/desktop in su */}
      <aside className="hidden w-60 shrink-0 flex-col border-r-2 border-lc-border bg-lc-surface md:flex">
        <div className="flex items-center gap-2.5 border-b-2 border-lc-border px-4 py-4">
          <img src={logo} alt="Lavoretty di Carta" className="h-10 w-10 rounded-2xl shadow-soft" />
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold">Lavoretty di Carta</p>
            <p className="text-[11px] font-semibold text-lc-muted">angolo creativo ✂️</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-3 rounded-btn px-3 py-2.5 text-left font-display text-sm font-semibold transition-colors ${
                  active ? 'bg-lc-accent/30 text-lc-olive' : 'text-lc-muted hover:bg-lc-border/30 hover:text-lc-text'
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.5 : 2} />
                {label}
              </button>
            );
          })}
        </nav>
        <div className="flex flex-col gap-1 border-t-2 border-lc-border p-3">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center gap-3 rounded-btn px-3 py-2.5 text-left font-display text-sm font-semibold text-lc-muted transition-colors hover:bg-lc-border/30 hover:text-lc-text"
          >
            <Settings size={19} />
            Impostazioni
          </button>
          <button
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
        <header className="relative overflow-hidden border-b-2 border-lc-border bg-lc-accent px-4 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))] md:hidden">
          <div className="lc-paper-bg pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative flex items-center gap-3">
            <img src={logo} alt="Lavoretty di Carta" className="h-11 w-11 rounded-2xl shadow-soft" />
            <div className="flex-1">
              <h1 className="font-display text-lg font-semibold leading-tight text-lc-accent-ink">
                Lavoretty di Carta
              </h1>
              <p className="text-xs font-semibold text-lc-accent-ink/70">il tuo angolo creativo ✂️✨</p>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Impostazioni"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/10 text-lc-accent-ink transition-transform active:scale-90"
            >
              <Settings size={17} />
            </button>
            <button
              onClick={toggleTheme}
              aria-label="Cambia tema"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/10 text-lc-accent-ink transition-transform active:scale-90"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 md:pb-6">
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

        {/* Tab bar: solo su mobile */}
        <nav className="fixed bottom-0 left-0 flex w-full gap-1 border-t-2 border-lc-border bg-lc-surface px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 md:hidden">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-btn py-1.5 text-[11px] font-bold transition-colors ${
                  active ? 'bg-lc-accent/30 text-lc-olive' : 'text-lc-muted'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default App;
