/**
 * Download the latest statistics and Wikipedia event lists into data/sources/.
 *
 *   npm run data:fetch      # then `npm run data:build`, or both: `npm run data:update`
 *
 * Download links are looked up from data.gov.tw each time instead of being
 * written here, because the agencies move their files (the household-survey
 * links change path every year).
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECT } from '../../src/domain/project.ts';
import { SOURCES, wikipediaYearTitle, wikipediaYearUrl, type SourceId } from '../../src/domain/sources.ts';
import { ROC_YEAR_OFFSET, yearOf } from '../../src/domain/periods.ts';
import { MANIFEST_FILE, SOURCES_DIR, STATISTICS_INPUTS, WIKIPEDIA_DIR, type Manifest, type ManifestEntry, type StatisticsInput } from './inputs.ts';
import { parseMoiPopulationCsv, parseYearByRegionCsv } from './lib/tables.ts';
import { extractSection } from './lib/wikitext.ts';

const ROOT = new URL('../../', import.meta.url);
const DATA_GOV_TW_API = 'https://data.gov.tw/api/v2/rest/dataset/';
const WIKIPEDIA_API = 'https://zh.wikipedia.org/w/api.php';
/** Wikimedia asks for at most one request at a time; a pause keeps us well inside that. */
const WIKIPEDIA_PAUSE_MS = 1000;

// Wikimedia's policy asks bots to say who they are and how to reach the operator.
const USER_AGENT = `${PROJECT.name}/${PROJECT.version} (${PROJECT.repoUrl}; data updater)`;

function path(relative: string): string {
  return fileURLToPath(new URL(relative, ROOT));
}

async function get(url: string): Promise<{ body: string; url: string }> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return { body: await res.text(), url: res.url };
}

async function save(file: string, body: string, url: string, extra: Partial<ManifestEntry> = {}): Promise<ManifestEntry> {
  const target = path(file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, body);
  return {
    file,
    url,
    fetchedAt: new Date().toISOString(),
    sha256: createHash('sha256').update(body).digest('hex'),
    bytes: Buffer.byteLength(body),
    ...extra,
  };
}

interface DatasetMetadata {
  notes?: string;
  distribution?: Array<{ resourceFormat?: string; resourceDownloadUrl?: string }>;
}

async function datasetMetadata(source: SourceId): Promise<DatasetMetadata> {
  const id = (SOURCES[source] as { dataGovTwId?: number }).dataGovTwId;
  if (!id) throw new Error(`${source} has no data.gov.tw id`);
  const { body } = await get(`${DATA_GOV_TW_API}${id}`);
  const json = JSON.parse(body) as { success?: boolean; result?: DatasetMetadata };
  if (!json.success || !json.result) throw new Error(`data.gov.tw returned no metadata for dataset ${id}`);
  return json.result;
}

/** Current month in the ROC calendar, e.g. 11510 for October 2026. */
function rocYearMonth(date: Date): string {
  return `${date.getFullYear() - ROC_YEAR_OFFSET}${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * The CSV that data.gov.tw links for the population table is a fixed 2020 extract.
 * The dataset's notes give the statistics-portal query instead, with `ym`/`ymt`
 * for the first and last month; we keep its start and ask up to this month.
 */
async function populationUrl(meta: DatasetMetadata): Promise<string> {
  const match = /https:\/\/statis\.moi\.gov\.tw\/\S+/.exec(meta.notes ?? '');
  if (!match) throw new Error('The population dataset notes no longer contain a statis.moi.gov.tw query URL');
  const url = new URL(match[0]);
  url.searchParams.set('ymt', rocYearMonth(new Date()));
  return url.href;
}

function csvUrl(meta: DatasetMetadata): string {
  const csv = meta.distribution?.find((d) => d.resourceFormat?.toUpperCase() === 'CSV')?.resourceDownloadUrl;
  if (!csv) throw new Error('No CSV distribution in the dataset metadata');
  // The links contain raw Chinese file names; URL() percent-encodes them.
  return new URL(csv).href;
}

/** Parse before saving, so a changed layout fails here instead of breaking the build later. */
function check(input: StatisticsInput, body: string): void {
  const result = input.layout === 'moi-population' ? parseMoiPopulationCsv(body) : parseYearByRegionCsv(body, input.metric);
  if (result.records.length === 0) throw new Error(`${input.file}: no rows could be read`);
  if (result.unknownRegions.length > 0) {
    throw new Error(`${input.file}: unknown regions ${result.unknownRegions.join(', ')} (add them to src/domain/counties.ts)`);
  }
}

async function fetchStatistics(manifest: Manifest): Promise<number[]> {
  let years: number[] = [];
  for (const input of STATISTICS_INPUTS) {
    const meta = await datasetMetadata(input.source);
    const url = input.layout === 'moi-population' ? await populationUrl(meta) : csvUrl(meta);
    const { body } = await get(url);
    check(input, body);
    manifest.statistics[input.source] = await save(`${SOURCES_DIR}/${input.file}`, body, url);
    console.log(`  ${input.file}: ${Buffer.byteLength(body).toLocaleString()} bytes`);
    if (input.layout === 'moi-population') {
      years = [...new Set(parseMoiPopulationCsv(body).records.map((r) => yearOf(r.period)))].sort();
    }
  }
  return years;
}

async function fetchWikipedia(manifest: Manifest, years: readonly number[]): Promise<void> {
  for (const year of years) {
    const params = new URLSearchParams({
      action: 'parse',
      page: wikipediaYearTitle(year),
      prop: 'wikitext|revid',
      redirects: '1',
      format: 'json',
      formatversion: '2',
      maxlag: '5',
    });
    const { body } = await get(`${WIKIPEDIA_API}?${params}`);
    const json = JSON.parse(body) as { parse?: { title: string; revid: number; wikitext: string }; error?: { info: string } };
    if (!json.parse) {
      console.log(`  ${year}: skipped (${json.error?.info ?? 'no page'})`);
    } else {
      const section = extractSection(json.parse.wikitext);
      if (section === undefined) {
        console.log(`  ${year}: skipped (no 大事記 section)`);
      } else {
        manifest.wikipedia[String(year)] = await save(
          `${WIKIPEDIA_DIR}/${year}.wiki`,
          section,
          wikipediaYearUrl(year, json.parse.revid),
          { title: json.parse.title, revision: json.parse.revid },
        );
        console.log(`  ${year}: revision ${json.parse.revid}, ${section.length.toLocaleString()} characters`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, WIKIPEDIA_PAUSE_MS));
  }
}

const manifest: Manifest = { statistics: {}, wikipedia: {} };
console.log('Statistics (data.gov.tw):');
const years = await fetchStatistics(manifest);
console.log(`Wikipedia events, ${years[0]}–${years[years.length - 1]}:`);
await fetchWikipedia(manifest, years);
await writeFile(path(MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${MANIFEST_FILE}. Run \`npm run data:build\` next.`);
