import { Check, Plus, X } from 'lucide-react';
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { DatasetSeries } from '../domain/atlas.ts';
import { COUNTIES, NATIONAL, countyByCode, reorganisationNote } from '../domain/counties.ts';
import { DATASETS, type MetricDef } from '../domain/metrics.ts';
import { formatPeriod, type Period } from '../domain/periods.ts';
import { formatChange, formatDifference, formatValue } from '../lib/format.ts';
import { MAX_COMPARED } from '../lib/palette.ts';
import type { PeriodEvents, RankedCounty } from '../lib/series.ts';
import { NewsList } from './NewsList.tsx';
import { trendLines } from '../lib/trend.ts';
import { TrendChart } from './TrendChart.tsx';

export type PanelTab = 'county' | 'news' | 'ranking';

export interface PanelProps {
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  metric: MetricDef;
  series: DatasetSeries;
  period: Period;
  county: string | null;
  /** Compared counties by colour slot. */
  compare: readonly (string | null)[];
  colors: readonly string[];
  ranked: readonly RankedCounty[];
  events: PeriodEvents;
  yoy: { diff: number; ratio: number | null } | null;
  onSelect: (code: string | null) => void;
  onToggleCompare: (code: string) => void;
  onPickPeriod: (period: Period) => void;
}

const TABS: readonly PanelTab[] = ['county', 'news', 'ranking'];

export function SidePanel(props: PanelProps) {
  const { tab, onTab, county } = props;
  const id = useId();
  const refs = useRef<Record<PanelTab, HTMLButtonElement | null>>({ county: null, news: null, ranking: null });
  const labels: Record<PanelTab, string> = {
    // The 2017 tab took the county's name; 「-」 there became 「縣市資訊」.
    county: county ? (countyByCode(county)?.name ?? '縣市資訊') : '縣市資訊',
    news: '當期焦點新聞',
    ranking: '排名',
  };

  const onKey = (e: KeyboardEvent) => {
    const i = TABS.indexOf(tab);
    const next = e.key === 'ArrowRight' ? TABS[(i + 1) % TABS.length] : e.key === 'ArrowLeft' ? TABS[(i + TABS.length - 1) % TABS.length] : undefined;
    if (next) {
      e.preventDefault();
      onTab(next);
      refs.current[next]?.focus();
    }
  };

  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-line bg-surface">
      <div role="tablist" aria-label="資訊分頁" className="flex border-b border-line px-2" onKeyDown={onKey}>
        {TABS.map((t) => (
          <button
            key={t}
            ref={(el) => {
              refs.current[t] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-${t}`}
            aria-selected={tab === t}
            aria-controls={`${id}-${t}-panel`}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => onTab(t)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm transition-colors ${
              tab === t ? 'border-accent font-semibold text-ink' : 'border-transparent text-ink-2 hover:text-ink'
            }`}
          >
            {labels[t]}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-${tab}-panel`} aria-labelledby={`${id}-${tab}`} className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'county' && <CountyTab {...props} />}
        {tab === 'news' && <NewsTab {...props} />}
        {tab === 'ranking' && <RankingTab {...props} />}
      </div>
    </section>
  );
}

function CountyTab({ metric, series, period, county, compare, colors, ranked, events, yoy, onSelect, onToggleCompare, onPickPeriod }: PanelProps) {
  const info = county ? countyByCode(county) : undefined;
  const values = series.metrics[metric.id]?.values ?? {};
  const index = series.periods.indexOf(period);
  const national = values[NATIONAL]?.[index] ?? null;
  const row = ranked.find((r) => r.code === county);
  const slot = county ? compare.indexOf(county) : -1;
  const full = compare.filter(Boolean).length >= MAX_COMPARED;
  const nationalLabel = DATASETS[metric.dataset].nationalLabel;

  const trend = trendLines({ metric, series, county, compare, colors });

  return (
    <div className="flex flex-col gap-4">
      {info ? (
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold">{info.name}</h2>
              <p className="text-xs text-ink-2">{info.english}</p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onToggleCompare(info.code)}
                disabled={slot < 0 && full}
                className="flex h-8 items-center gap-1 rounded-full border border-line px-3 text-xs hover:bg-surface-2 disabled:opacity-50"
                title={slot < 0 && full ? `最多比較 ${MAX_COMPARED} 個縣市` : undefined}
              >
                {slot >= 0 ? <Check className="size-3.5" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}
                {slot >= 0 ? '比較中' : '加入比較'}
              </button>
              <button type="button" onClick={() => onSelect(null)} aria-label="關閉縣市資訊" className="flex size-8 items-center justify-center rounded-full hover:bg-surface-2">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink-2">
            日期：{formatPeriod(period)}・{metric.label}
          </p>
          <p className="text-3xl font-semibold">{formatValue(metric, row?.value ?? null)}</p>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <Stat label={nationalLabel}>{formatValue(metric, national)}</Stat>
            <Stat label="排名">{row?.rank ? `${row.rank} / ${ranked.filter((r) => r.rank !== null).length}` : '—'}</Stat>
            <Stat label="比去年同期">
              {yoy ? (metric.unit === '‰' || yoy.ratio === null ? formatDifference(metric, yoy.diff) : formatChange(yoy.ratio)) : '—'}
            </Stat>
          </dl>
          {reorganisationNote(info) && <p className="mt-2 text-xs text-ink-2">{reorganisationNote(info)}。更早的數字由資料來源依現行縣市範圍回溯計算。</p>}
        </div>
      ) : (
        <div>
          <p className="text-sm">請點選地圖任意地方，選取一個縣市。</p>
          <p className="mt-3 text-sm text-ink-2">
            {formatPeriod(period)}・{nationalLabel}的{metric.label}
          </p>
          <p className="text-3xl font-semibold">{formatValue(metric, national)}</p>
        </div>
      )}

      <div>
        <h3 className="mb-1 text-sm font-semibold">歷年變化</h3>
        <TrendChart metric={metric} periods={series.periods} series={trend} current={period} onPick={onPickPeriod} />
        {compare.some(Boolean) && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="比較中的縣市">
            {compare.map((code, i) =>
              code ? (
                <li key={code}>
                  <button type="button" onClick={() => onToggleCompare(code)} className="flex h-7 items-center gap-1.5 rounded-full border border-line px-2.5 text-xs hover:bg-surface-2">
                    <span className="size-2.5 rounded-full" style={{ background: colors[i] }} aria-hidden="true" />
                    {countyByCode(code)?.name}
                    <X className="size-3" aria-hidden="true" />
                    <span className="sr-only">移出比較</span>
                  </button>
                </li>
              ) : null,
            )}
          </ul>
        )}
      </div>

      {info && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">
            {info.name}的{series.frequency === 'year' ? '全年' : '當月'}新聞
          </h3>
          <NewsList events={events.county} source={events.source} />
        </div>
      )}
    </div>
  );
}

function NewsTab({ period, series, events }: PanelProps) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">
        {formatPeriod(period)}{series.frequency === 'year' ? '全年' : ''}的全國焦點新聞
      </h2>
      <NewsList events={events.national} source={events.source} />
    </div>
  );
}

function RankingTab({ metric, period, county, compare, colors, ranked, onSelect, onToggleCompare }: PanelProps) {
  const values = ranked.map((r) => r.value).filter((v): v is number => v !== null);
  const reach = Math.max(...values.map(Math.abs), 1e-9);
  const diverging = metric.scale === 'diverging';
  const full = compare.filter(Boolean).length >= MAX_COMPARED;
  return (
    <table className="w-full text-sm">
      <caption className="mb-2 text-left text-sm font-semibold">
        {formatPeriod(period)}・{metric.label}（{metric.unit}）
      </caption>
      <thead className="sr-only">
        <tr>
          <th>名次</th>
          <th>縣市</th>
          <th>數值</th>
          <th>比較</th>
        </tr>
      </thead>
      <tbody>
        {ranked.map((r) => {
          const slot = compare.indexOf(r.code);
          const share = r.value === null ? 0 : Math.abs(r.value) / reach;
          return (
            <tr key={r.code} className={`border-t border-line ${r.code === county ? 'bg-surface-2' : ''}`}>
              <td className="w-8 py-1.5 pr-1 text-right tabular-nums text-ink-2">{r.rank ?? '—'}</td>
              <td className="py-1.5 pl-1">
                <button type="button" onClick={() => onSelect(r.code)} className="hover:underline">
                  {r.name}
                </button>
                <div className={`mt-1 flex h-1.5 ${diverging ? 'justify-center' : ''}`} aria-hidden="true">
                  {diverging ? (
                    <div className="flex w-full">
                      <div className="flex w-1/2 justify-end">{r.value !== null && r.value < 0 && <Bar share={share} end="left" />}</div>
                      <div className="w-px bg-axis" />
                      <div className="w-1/2">{r.value !== null && r.value > 0 && <Bar share={share} />}</div>
                    </div>
                  ) : (
                    <Bar share={share} />
                  )}
                </div>
              </td>
              <td className="py-1.5 pl-2 text-right tabular-nums">{formatValue(metric, r.value)}</td>
              <td className="w-9 py-1.5 pl-1 text-right">
                <button
                  type="button"
                  onClick={() => onToggleCompare(r.code)}
                  disabled={slot < 0 && full}
                  aria-label={slot >= 0 ? `把${r.name}移出比較` : `加入比較：${r.name}`}
                  aria-pressed={slot >= 0}
                  className="inline-flex size-7 items-center justify-center rounded-full border border-line hover:bg-surface-2 disabled:opacity-40"
                >
                  {slot >= 0 ? <span className="size-2.5 rounded-full" style={{ background: colors[slot] }} /> : <Plus className="size-3.5" aria-hidden="true" />}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={4} className="pt-2 text-xs text-ink-2">
            共 {COUNTIES.length} 個縣市；沒有資料的縣市排在最後。
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

/** One horizontal bar in the ranking: a single hue, rounded at the data end only. */
function Bar({ share, end = 'right' }: { share: number; end?: 'left' | 'right' }) {
  return <div className={`h-1.5 bg-accent ${end === 'left' ? 'rounded-l-sm' : 'rounded-r-sm'}`} style={{ width: `${Math.max(share * 100, 1)}%` }} />;
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2 py-1.5">
      <dt className="text-xs text-ink-2">{label}</dt>
      <dd className="font-semibold tabular-nums">{children}</dd>
    </div>
  );
}
