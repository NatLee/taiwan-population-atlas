import type { MetricDef } from '../domain/metrics.ts';
import { formatCompact } from '../lib/format.ts';
import type { ColorDomain } from '../lib/scales.ts';
import { NO_DATA_PATTERN } from '../lib/map.ts';

interface Props {
  metric: MetricDef;
  domain: ColorDomain;
  stops: readonly string[];
  /** Whether some county has no value in the current period. */
  showNoData: boolean;
  rangeLabel: string;
}

/** The 2017 page's Low → High ruler, with the numbers at both ends. */
export function Legend({ metric, domain, stops, showNoData, rangeLabel }: Props) {
  const diverging = metric.scale === 'diverging';
  const low = formatCompact(metric, domain.min);
  const high = formatCompact(metric, domain.max);
  const unit = metric.unit === '‰' ? '‰' : ` ${metric.unit}`;
  return (
    <figure className="pointer-events-auto w-64 rounded-lg border border-line bg-surface/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
      <figcaption className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-semibold text-ink">
          {metric.label}（{metric.unit}）
        </span>
        <span className="shrink-0 text-ink-2" title="同一個顏色在所有時間代表同一個數字">{rangeLabel} 色階</span>
      </figcaption>
      <div
        className="h-2.5 rounded-sm"
        style={{ background: `linear-gradient(to right, ${stops.join(', ')})` }}
        role="img"
        aria-label={`顏色由 ${low}${unit} 到 ${high}${unit}`}
      />
      <div className="mt-1 flex justify-between tabular-nums text-ink-2">
        <span>
          {domain.clamped ? '≤ ' : ''}
          {low}
        </span>
        {diverging && <span>0</span>}
        <span>
          {domain.clamped ? '≥ ' : ''}
          {high}
        </span>
      </div>
      <div className="flex justify-between text-ink-2">
        <span>{diverging ? '減少 Low' : '低 Low'}</span>
        <span>{diverging ? '增加 High' : '高 High'}</span>
      </div>
      {showNoData && (
        <div className="mt-1.5 flex items-center gap-1.5 text-ink-2">
          <svg width="14" height="10" aria-hidden="true">
            <rect width="14" height="10" fill={`url(#${NO_DATA_PATTERN})`} stroke="var(--line)" />
          </svg>
          尚無資料
        </div>
      )}
    </figure>
  );
}
