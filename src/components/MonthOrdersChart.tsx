import { useState } from 'react';
import { Card } from '@/components/ui/primitives';
import { countsAsRevenue, formatEUR, orderTotal } from '@/utils/calc';
import type { Order } from '@/types';

const LABELED_DAYS = new Set([1, 5, 10, 15, 20, 25]);

function ordersLabel(count: number): string {
  return `${count} ordin${count === 1 ? 'e' : 'i'}`;
}

export function MonthOrdersChart({ orders }: { orders: Order[] }) {
  const [active, setActive] = useState<number | null>(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, count: 0, total: 0 }));
  for (const o of orders) {
    if (!countsAsRevenue(o)) continue;
    const d = new Date(o.createdAt);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const slot = days[d.getDate() - 1];
    slot.count += 1;
    slot.total += orderTotal(o);
  }

  const monthCount = days.reduce((sum, d) => sum + d.count, 0);
  const monthTotal = days.reduce((sum, d) => sum + d.total, 0);
  const max = Math.max(1, ...days.map((d) => d.count));
  const monthName = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  function dayLabel(day: number): string {
    return new Date(year, month, day).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  const shown = active != null ? days[active - 1] : null;
  const readout = shown
    ? `${dayLabel(shown.day)}: ${ordersLabel(shown.count)} · ${formatEUR(shown.total)}`
    : monthCount === 0
      ? 'Nessun ordine ancora questo mese'
      : `${ordersLabel(monthCount)} nel mese · ${formatEUR(monthTotal)}`;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="font-display font-semibold">Ordini del mese</p>
        <p className="text-xs font-semibold capitalize text-lc-muted">{monthName}</p>
      </div>
      <p className="min-h-5 text-sm font-semibold text-lc-text" aria-live="polite">
        {readout}
      </p>

      <div className="flex gap-1.5">
        <div className="flex h-32 w-4 shrink-0 flex-col justify-between text-right text-[10px] leading-none text-lc-muted">
          <span>{max}</span>
          <span>0</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex h-32 items-end gap-[2px] border-b border-lc-border" role="group" aria-label="Ordini per giorno del mese">
            <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-lc-border" />
            {days.map(({ day, count, total }) => (
              <button
                key={day}
                type="button"
                aria-label={`${dayLabel(day)}: ${ordersLabel(count)}, ${formatEUR(total)}`}
                onMouseEnter={() => setActive(day)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(day)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(active === day ? null : day)}
                className="relative flex h-full min-w-0 flex-1 items-end"
              >
                {count > 0 && (
                  <span
                    className={`block w-full rounded-t-[4px] bg-lc-olive transition-opacity ${
                      active != null && active !== day ? 'opacity-40' : ''
                    }`}
                    style={{ height: `${(count / max) * 100}%`, minHeight: 4 }}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="flex h-4 gap-[2px]">
            {days.map(({ day }) => (
              <span key={day} className="relative min-w-0 flex-1">
                {(LABELED_DAYS.has(day) || day === daysInMonth) && (
                  <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] leading-none text-lc-muted">
                    {day}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-lc-muted">Preventivi e ordini annullati non sono conteggiati.</p>
    </Card>
  );
}
