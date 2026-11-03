import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { METRICS, getMetric, type MetricId } from '../domain/metrics.ts';
import type { SoundName } from '../hooks/useSound.ts';
import { MetricIcon } from './MetricIcon.tsx';

interface Props {
  value: MetricId;
  onChange: (metric: MetricId) => void;
  playSound: (name: SoundName) => void;
}

/** Delay between menu items appearing, as the 2017 phone menu did (50 ms each). */
const STAGGER_MS = 50;

/**
 * The phone version of the metric picker, kept from 2017: one round button that
 * rotates open, dims the page and lists the metrics one after another, with the
 * original sound effects.
 */
export function MobileMetricMenu({ value, onChange, playSound }: Props) {
  const [open, setOpen] = useState(false);
  const current = getMetric(value);

  const show = () => {
    setOpen(true);
    playSound('fadeIn');
  };
  const hide = () => {
    setOpen(false);
    playSound('fadeOut');
  };
  const pick = (metric: MetricId) => {
    onChange(metric);
    setOpen(false);
    playSound('press');
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <>
      {open && (
        <div aria-hidden="true" className="fixed inset-0 z-30 bg-[var(--mask)]" onClick={hide} data-testid="menu-mask" />
      )}
      <div className="absolute bottom-3 left-3 z-40 flex flex-col items-start gap-2">
        {open && (
          <ul role="menu" aria-label="選擇指標" className="flex flex-col items-start gap-2">
            {METRICS.map((m, i) => (
              <li key={m.id} role="none" className="menu-item-in" style={{ animationDelay: `${i * STAGGER_MS}ms` }}>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={m.id === value}
                  onClick={() => pick(m.id)}
                  className={`flex h-11 items-center gap-2 rounded-full px-4 text-sm shadow-md ${
                    m.id === value ? 'bg-accent text-on-accent' : 'bg-surface text-ink'
                  }`}
                >
                  <MetricIcon metric={m.id} className="size-5" />
                  {m.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={open ? hide : show}
          className="flex h-12 items-center gap-2 rounded-full bg-accent pl-4 pr-3 text-sm text-on-accent shadow-lg"
        >
          <MetricIcon metric={current.id} className="size-5" />
          <span>{current.label}</span>
          <Plus aria-hidden="true" className={`size-5 transition-transform duration-300 ${open ? 'rotate-45' : ''}`} />
          <span className="sr-only">{open ? '收起指標選單' : '展開指標選單'}</span>
        </button>
      </div>
    </>
  );
}
