import { useEffect, useState, lazy, Suspense } from 'react';
import { LayoutDashboard, Users, Boxes, Package, ClipboardList } from 'lucide-react';
import { useStore } from '@/store/useStore';
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
  const { ready, load } = useStore();

  useEffect(() => {
    load();
  }, [load]);

  if (!ready) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-lc-bg">
        <img src={logo} alt="" className="h-28 w-28 animate-pop-in rounded-blob shadow-soft" />
        <p className="font-display text-lc-muted">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col bg-lc-bg">
      <header className="relative overflow-hidden border-b-2 border-lc-border bg-lc-accent px-4 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="lc-paper-bg pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex items-center gap-3">
          <img src={logo} alt="Lavoretty di Carta" className="h-11 w-11 rounded-2xl shadow-soft" />
          <div>
            <h1 className="font-display text-lg font-semibold leading-tight text-lc-accent-ink">
              Lavoretty di Carta
            </h1>
            <p className="text-xs font-semibold text-lc-accent-ink/70">il tuo angolo creativo ✂️✨</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <Suspense fallback={<div className="p-4 text-lc-muted">Caricamento...</div>}>
          {tab === 'dashboard' && <Dashboard />}
          {tab === 'clienti' && <Clienti />}
          {tab === 'materiali' && <Materiali />}
          {tab === 'prodotti' && <Prodotti />}
          {tab === 'ordini' && <Ordini />}
        </Suspense>
      </main>

      <nav className="fixed bottom-0 left-1/2 flex w-full max-w-2xl -translate-x-1/2 gap-1 border-t-2 border-lc-border bg-lc-surface px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
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
  );
}

export default App;
