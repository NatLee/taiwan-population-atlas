/**
 * Build the files the app loads (public/data/) from the inputs in data/.
 *
 *   npm run data:build
 *
 * Inputs are stacked oldest first: the 2017 snapshot (data/legacy-2017), then
 * whatever `npm run data:fetch` downloaded (data/sources). Newer inputs win, and
 * every number they replace is compared and summarised below, so the 2017
 * conversion is checked against today's official tables on every build.
 * The output contains no timestamps: the same inputs always give the same files.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { ATLAS_FORMAT_VERSION, type AtlasData, type NewsData, type NewsYear } from '../../src/domain/atlas.ts';
import { COUNTIES, countyByCode } from '../../src/domain/counties.ts';
import { DATASETS, type DatasetId } from '../../src/domain/metrics.ts';
import { wikipediaYearUrl } from '../../src/domain/sources.ts';
import {
  LEGACY_DIR, LEGACY_EVENTS, LEGACY_TABLES, MANIFEST_FILE, OUTPUT_DIR, SOURCES_DIR, STATISTICS_INPUTS,
  type Manifest,
} from './inputs.ts';
import { mergeLayers, type Layer } from './lib/merge.ts';
import { convertLegacyEvents, tagEvents } from './lib/news.ts';
import type { ParseResult } from './lib/records.ts';
import { parseLegacyTable, parseMoiPopulationCsv, parseYearByRegionCsv } from './lib/tables.ts';
import { extractEvents } from './lib/wikitext.ts';

const ROOT = new URL('../../', import.meta.url);
const path = (relative: string) => fileURLToPath(new URL(relative, ROOT));
const read = (relative: string) => readFile(path(relative), 'utf8');

function checked(label: string, result: ParseResult): ParseResult {
  if (result.unknownRegions.length > 0) {
    throw new Error(`${label}: unknown regions ${result.unknownRegions.join(', ')} (add them to src/domain/counties.ts)`);
  }
  return result;
}

async function statisticsLayers(): Promise<Layer[]> {
  const legacy: Layer = { input: 'legacy-2017', records: [] };
  for (const table of LEGACY_TABLES) {
    const json = JSON.parse(await read(`${LEGACY_DIR}/${table.file}`)) as Parameters<typeof parseLegacyTable>[0];
    legacy.records.push(...checked(table.file, parseLegacyTable(json, table.columns)).records);
  }
  const layers = [legacy];
  for (const input of STATISTICS_INPUTS) {
    const file = `${SOURCES_DIR}/${input.file}`;
    if (!existsSync(path(file))) {
      console.log(`  (no ${file}; run \`npm run data:fetch\` to add it)`);
      continue;
    }
    const text = await read(file);
    const result = input.layout === 'moi-population' ? parseMoiPopulationCsv(text) : parseYearByRegionCsv(text, input.metric);
    layers.push({ input: input.source, records: checked(file, result).records });
  }
  return layers;
}

async function buildAtlas(): Promise<AtlasData> {
  const layers = await statisticsLayers();
  const datasets = {} as AtlasData['datasets'];
  for (const id of Object.keys(DATASETS) as DatasetId[]) {
    const { series, report } = mergeLayers(id, layers);
    datasets[id] = series;
    const share = report.overlapping === 0 ? '—' : `${(100 - (report.differences.length / report.overlapping) * 100).toFixed(2)}%`;
    console.log(`  ${id}: ${series.periods.length} periods (${series.periods[0]} – ${series.periods.at(-1)})`);
    console.log(`    2017 snapshot vs today's tables: ${report.overlapping} shared values, ${report.differences.length} differ, ${share} identical`);
    for (const d of report.differences.slice(0, 5)) {
      console.log(`      e.g. ${d.metric} ${d.period} ${countyByCode(d.region)?.name ?? d.region}: ${d.older} → ${d.newer}`);
    }
    for (const p of series.provenance) console.log(`    ${p.input}: ${p.first} – ${p.last}`);
  }
  return { version: ATLAS_FORMAT_VERSION, datasets };
}

async function buildNews(): Promise<NewsData> {
  const legacy = convertLegacyEvents(JSON.parse(await read(`${LEGACY_DIR}/${LEGACY_EVENTS.file}`)));
  const years = new Map<number, NewsYear>(legacy);
  if (existsSync(path(MANIFEST_FILE))) {
    const manifest = JSON.parse(await read(MANIFEST_FILE)) as Manifest;
    for (const [yearText, entry] of Object.entries(manifest.wikipedia)) {
      const year = Number(yearText);
      const events = extractEvents(await read(entry.file), year);
      if (events.length === 0 || !entry.title || !entry.revision) continue;
      years.set(year, {
        input: 'wikipedia-events',
        page: { title: entry.title, revision: entry.revision, url: wikipediaYearUrl(year, entry.revision) },
        events: tagEvents(events),
      });
    }
  }
  const sorted = [...years.entries()].sort(([a], [b]) => a - b);
  for (const [year, data] of sorted) {
    const before = legacy.get(year)?.events.length;
    const tagged = data.events.filter((e) => e.counties.length > 0).length;
    console.log(`  ${year}: ${data.events.length} events (${tagged} name a county) from ${data.input}${before !== undefined && data.input !== 'legacy-2017' ? `; 2017 snapshot had ${before}` : ''}`);
  }
  return { version: ATLAS_FORMAT_VERSION, years: Object.fromEntries(sorted.map(([y, d]) => [String(y), d])) };
}

interface Topology {
  type: 'Topology';
  objects: Record<string, { type: string; geometries: Array<{ properties?: Record<string, unknown> }> }>;
}

/** Keep only the county shapes, labelled with the registry's codes and 臺 spelling. */
async function buildBoundaries(): Promise<Topology> {
  const file = createRequire(import.meta.url).resolve('taiwan-atlas/counties-10t.json');
  const topo = JSON.parse(await readFile(file, 'utf8')) as Topology;
  const counties = topo.objects['counties'];
  if (!counties) throw new Error('taiwan-atlas: no "counties" object');
  const seen = new Set<string>();
  for (const g of counties.geometries) {
    const code = String(g.properties?.['COUNTYCODE'] ?? '');
    const county = countyByCode(code);
    if (!county) throw new Error(`taiwan-atlas: county code ${code} is not in src/domain/counties.ts`);
    g.properties = { code, name: county.name };
    seen.add(code);
  }
  const missing = COUNTIES.filter((c) => !seen.has(c.code)).map((c) => c.name);
  if (missing.length > 0) throw new Error(`taiwan-atlas: no shape for ${missing.join(', ')}`);
  return { ...topo, objects: { counties } };
}

async function writeJson(name: string, data: unknown): Promise<void> {
  const file = `${OUTPUT_DIR}/${name}`;
  const body = `${JSON.stringify(data)}\n`;
  await writeFile(path(file), body);
  console.log(`  wrote ${file} (${Math.round(Buffer.byteLength(body) / 1024)} KB)`);
}

await mkdir(path(OUTPUT_DIR), { recursive: true });
console.log('Statistics:');
const atlas = await buildAtlas();
console.log('Events:');
const news = await buildNews();
console.log('Boundaries:');
const boundaries = await buildBoundaries();
console.log('Output:');
await writeJson('atlas.json', atlas);
await writeJson('events.json', news);
await writeJson('counties.topo.json', boundaries);
