import { useEffect, useState, lazy, Suspense } from 'react';
import { LayoutDashboard, Users, Boxes, Package, ClipboardList } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Dashboard } from '@/pages/Dashboard';
import { Clienti } from '@/pages/Clienti';
import { Materiali } from '@/pages/Materiali';

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
      <div className="flex h-dvh items-center justify-center bg-lc-bg text-lc-muted">Caricamento...</div>
    );
  }

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col bg-lc-bg text-lc-text">
      <header className="border-b border-lc-border px-4 py-3">
        <h1 className="text-lg font-semibold">Lavoretty di Carta</h1>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <Suspense fallback={<div className="p-4 text-lc-muted">Caricamento...</div>}>
          {tab === 'dashboard' && <Dashboard />}
          {tab === 'clienti' && <Clienti />}
          {tab === 'materiali' && <Materiali />}
          {tab === 'prodotti' && <Prodotti />}
          {tab === 'ordini' && <Ordini />}
        </Suspense>
      </main>

      <nav className="fixed bottom-0 left-1/2 flex w-full max-w-2xl -translate-x-1/2 border-t border-lc-border bg-lc-surface">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
              tab === id ? 'text-lc-accent' : 'text-lc-muted'
            }`}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
