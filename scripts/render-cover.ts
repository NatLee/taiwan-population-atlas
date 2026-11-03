/**
 * Write docs/images/cover.html: the README cover / social preview (1280×640),
 * drawn from the real data. Render it to PNG with any headless browser, e.g.
 *
 *   msedge --headless=new --window-size=1280,640 --screenshot=docs/images/cover.png docs/images/cover.html
 *
 * The map shows how much each county's population changed between the first
 * and the latest month in public/data/atlas.json.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { geoMercator, geoPath } from 'd3-geo';
import { interpolateLab, piecewise } from 'd3-interpolate';
import { scaleDiverging } from 'd3-scale';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { AtlasData } from '../src/domain/atlas.ts';
import { countyByCode } from '../src/domain/counties.ts';
import { formatPeriod } from '../src/domain/periods.ts';
import { PALETTES } from '../src/lib/palette.ts';
import { DIVERGING_COVERAGE } from '../src/lib/scales.ts';
import { quantile } from 'd3-array';

const ROOT = new URL('../', import.meta.url);
const read = async (p: string) => JSON.parse(await readFile(new URL(p, ROOT), 'utf8'));
const atlas = (await read('public/data/atlas.json')) as AtlasData;
const topo = (await read('public/data/counties.topo.json')) as Topology;

const WIDTH = 1280;
const HEIGHT = 640;
const MAP = { x: 660, y: 20, w: 580, h: 600 };

const pop = atlas.datasets.population;
const values = pop.metrics.population?.values ?? {};
const last = pop.periods.length - 1;
const change = new Map<string, number>();
for (const [code, row] of Object.entries(values)) {
  const a = row[0];
  const b = row[last];
  if (a && b && countyByCode(code)) change.set(code, b / a - 1);
}
// Same clamping rule as the app's map: Kinmen's registrations nearly tripled, which would wash out everyone else.
const reach = quantile([...change.values()].map(Math.abs), DIVERGING_COVERAGE) ?? 1;
const color = scaleDiverging(piecewise(interpolateLab, [...PALETTES.light.diverging])).domain([-reach, 0, reach]).clamp(true);

const counties = feature(topo, topo.objects['counties'] as GeometryCollection<{ code: string; name: string }>) as FeatureCollection<
  Geometry,
  { code: string; name: string }
>;
const projection = geoMercator().fitExtent([[MAP.x, MAP.y], [MAP.x + MAP.w, MAP.y + MAP.h]], counties);
// One decimal is plenty at 1280×640 and keeps cover.html small.
const path = geoPath(projection).digits(1);
const shapes = counties.features
  .map((f) => `<path d="${path(f)}" fill="${color(change.get(f.properties.code) ?? 0)}" stroke="#fcfcfb" stroke-width="1"/>`)
  .join('');

const ranked = [...change.entries()].sort((a, b) => b[1] - a[1]);
const pct = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
const label = ([code, v]: [string, number]) => {
  const [x, y] = path.centroid(counties.features.find((f) => f.properties.code === code)!);
  return `<g><circle cx="${x}" cy="${y}" r="4" fill="#0b0b0b"/><text x="${x + 10}" y="${y + 6}" class="tag">${countyByCode(code)?.name} ${pct(v)}</text></g>`;
};
const grow = ranked[0];
const shrink = ranked[ranked.length - 1];
const from = formatPeriod(pop.periods[0] ?? '');
const to = formatPeriod(pop.periods[last] ?? '');

const html = `<!doctype html>
<meta charset="utf-8">
<title>Taiwan Population Atlas cover</title>
<style>
  html, body { margin: 0; }
  body { width: ${WIDTH}px; height: ${HEIGHT}px; background: #f9f9f7; color: #0b0b0b; overflow: hidden;
    font-family: system-ui, -apple-system, 'Segoe UI', 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif; }
  .text { position: absolute; left: 72px; top: 92px; width: 600px; }
  h1 { font-size: 64px; line-height: 1.1; margin: 0; letter-spacing: -0.01em; }
  .en { font-size: 30px; color: #52514e; margin-top: 12px; }
  .facts { font-size: 26px; line-height: 1.6; margin-top: 40px; }
  .legend { margin-top: 36px; font-size: 20px; color: #52514e; }
  .ramp { width: 360px; height: 14px; border-radius: 3px; margin: 8px 0 4px;
    background: linear-gradient(to right, ${PALETTES.light.diverging.join(', ')}); }
  .ends { width: 360px; display: flex; justify-content: space-between; }
  .foot { position: absolute; left: 72px; bottom: 48px; font-size: 20px; color: #52514e; }
  .tag { font-size: 22px; font-weight: 600; fill: #0b0b0b; paint-order: stroke; stroke: #f9f9f7; stroke-width: 5px; }
</style>
<div class="text">
  <h1>人口變遷<br>視覺分析工具</h1>
  <div class="en">Taiwan Population Atlas</div>
  <div class="facts">22 縣市・按月人口與按年家庭收支<br>播放 30 年變化、比較縣市、分享連結</div>
  <div class="legend">人口增減：${from} → ${to}
    <div class="ramp"></div>
    <div class="ends"><span>≤ ${pct(-reach)}</span><span>0</span><span>≥ ${pct(reach)}</span></div>
  </div>
</div>
<div class="foot">2017 嘉義黑客松作品・2026 重寫</div>
<svg width="${WIDTH}" height="${HEIGHT}" style="position:absolute;left:0;top:0">${shapes}${grow ? label(grow) : ''}${shrink ? label(shrink) : ''}</svg>
`;

const out = fileURLToPath(new URL('docs/images/cover.html', ROOT));
await writeFile(out, html);
console.log(`wrote ${out}`);
