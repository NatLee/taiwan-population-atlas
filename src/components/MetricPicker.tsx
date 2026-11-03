import { useState } from 'react';
import { DATASETS, METRICS, type DatasetId, type MetricId } from '../domain/metrics.ts';
import { MetricIcon } from './MetricIcon.tsx';

interface Props {
  value: MetricId;
  onChange: (metric: MetricId) => void;
}

const GROUPS = Object.keys(DATASETS) as DatasetId[];

/**
 * Metric buttons for tablets and desktops. Hovering or focusing one shows its
 * name and what it measures (the 2017 page's hover hint); the selected one is
 * highlighted and labelled.
 */
export function MetricPicker({ value, onChange }: Props) {
  const [hint, setHint] = useState<MetricId | null>(null);
  const hinted = METRICS.find((m) => m.id === hint);

  return (
    <div className="relative">
      <div role="radiogroup" aria-label="選擇指標" className="flex flex-wrap items-start gap-x-5 gap-y-2">
        {GROUPS.map((group) => (
          <div key={group} className="flex flex-col gap-1">
            <span className="text-xs text-ink-2">
              {DATASETS[group].label}（按{DATASETS[group].frequency === 'month' ? '月' : '年'}）
            </span>
            <div className="flex flex-wrap gap-1">
              {METRICS.filter((m) => m.dataset === group).map((m) => {
                const selected = m.id === value;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-describedby={hint === m.id ? 'metric-hint' : undefined}
                    onClick={() => onChange(m.id)}
                    onMouseEnter={() => setHint(m.id)}
                    onMouseLeave={() => setHint(null)}
                    onFocus={() => setHint(m.id)}
                    onBlur={() => setHint(null)}
                    className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      selected
                        ? 'border-accent bg-accent text-on-accent'
                        : 'border-line bg-surface text-ink hover:bg-surface-2'
                    }`}
                  >
                    <MetricIcon metric={m.id} className="size-4 shrink-0" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {hinted && (
        <div
          id="metric-hint"
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-20 mt-2 max-w-sm rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg"
        >
          <strong className="font-semibold">
            {hinted.label}（{hinted.unit}）
          </strong>
          <span className="ml-1 text-ink-2">{hinted.description}</span>
        </div>
      )}
    </div>
  );
}
