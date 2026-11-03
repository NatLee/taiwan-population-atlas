import type { AtlasData } from '../domain/atlas.ts';
import { DATASETS, METRICS, type DatasetId } from '../domain/metrics.ts';
import { formatPeriod } from '../domain/periods.ts';
import { PROJECT } from '../domain/project.ts';
import { SOURCES, type SourceId } from '../domain/sources.ts';

/** Every source that feeds the page, once, in the order the metrics use them. */
const LISTED: readonly SourceId[] = [...new Set<SourceId>([...METRICS.map((m) => m.source), 'wikipedia-events', 'moi-boundaries'])];

export function Footer({ atlas }: { atlas: AtlasData }) {
  return (
    <footer className="mt-2 grid gap-4 border-t border-line pt-4 text-xs text-ink-2 md:grid-cols-[2fr_1fr]">
      <div>
        <h2 className="mb-1 text-sm font-semibold text-ink">資料來源與授權</h2>
        <ul className="flex flex-col gap-0.5">
          {LISTED.map((id) => {
            const s = SOURCES[id];
            return (
              <li key={id}>
                {s.publisher}・
                <a className="underline underline-offset-2 hover:text-ink" href={s.url} target="_blank" rel="noreferrer">
                  {s.title}
                </a>
                （
                <a className="underline underline-offset-2 hover:text-ink" href={s.licence.url} target="_blank" rel="noreferrer">
                  {s.licence.name}
                </a>
                ）
              </li>
            );
          })}
        </ul>
        <p className="mt-2">
          {(Object.keys(DATASETS) as DatasetId[])
            .map((id) => {
              const p = atlas.datasets[id].periods;
              return `${DATASETS[id].label}資料：${formatPeriod(p[0] ?? '')}～${formatPeriod(p[p.length - 1] ?? '')}`;
            })
            .join('；')}
          。2010 年五都改制、2014 年桃園升格之前的數字，資料來源已依現行 22 縣市範圍回溯計算。
        </p>
      </div>
      <div>
        <h2 className="mb-1 text-sm font-semibold text-ink">關於</h2>
        <p>2017 年嘉義黑客松的作品，2026 年用 React 和 D3 重寫。</p>
        <p className="mt-1">
          程式碼以 Apache-2.0 授權：
          <a className="underline underline-offset-2 hover:text-ink" href={PROJECT.repoUrl} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
