/**
 * The 22 current counties and cities, plus the names they used before the
 * 2010 and 2014 reorganisations.
 *
 * Every input (statistics tables, news text, map boundaries) is matched to a
 * county through this registry, so a rename or merger only has to be described
 * once, here.
 */

/** A name a county used before it was upgraded or merged. */
export interface Predecessor {
  /** The old name, written with 臺. */
  name: string;
  /** First day the current county existed (ISO date). */
  replacedOn: string;
  /** What happened, in a short phrase for the UI. */
  change: '升格' | '合併升格';
}

export interface County {
  /** Five-digit county code used by the Ministry of the Interior (縣市代碼). */
  code: string;
  /** Official name, written with 臺. */
  name: string;
  /** English name, for the README and accessible labels. */
  english: string;
  /** Former counties whose area is now part of this one. */
  predecessors: readonly Predecessor[];
  /**
   * Short names that only ever refer to this county, used to tag news items.
   * Ambiguous ones (臺北, 新竹, 嘉義 each name two counties) are left out.
   */
  shortNames: readonly string[];
}

/** Key used for the whole-country row (區域別總計／臺灣地區) in every dataset. */
export const NATIONAL = 'national';
export type RegionCode = string;

const MUNICIPALITIES_2010 = '2010-12-25';
const TAOYUAN_2014 = '2014-12-25';

/** Listed in the order the Ministry of the Interior uses in its tables. */
export const COUNTIES: readonly County[] = [
  {
    // 「新北」 alone is left out: it also appears in 新北投, a district of Taipei.
    code: '65000', name: '新北市', english: 'New Taipei City', shortNames: [],
    predecessors: [{ name: '臺北縣', replacedOn: MUNICIPALITIES_2010, change: '升格' }],
  },
  { code: '63000', name: '臺北市', english: 'Taipei City', shortNames: [], predecessors: [] },
  {
    code: '68000', name: '桃園市', english: 'Taoyuan City', shortNames: ['桃園'],
    predecessors: [{ name: '桃園縣', replacedOn: TAOYUAN_2014, change: '升格' }],
  },
  {
    code: '66000', name: '臺中市', english: 'Taichung City', shortNames: ['臺中'],
    predecessors: [{ name: '臺中縣', replacedOn: MUNICIPALITIES_2010, change: '合併升格' }],
  },
  {
    code: '67000', name: '臺南市', english: 'Tainan City', shortNames: ['臺南'],
    predecessors: [{ name: '臺南縣', replacedOn: MUNICIPALITIES_2010, change: '合併升格' }],
  },
  {
    code: '64000', name: '高雄市', english: 'Kaohsiung City', shortNames: ['高雄'],
    predecessors: [{ name: '高雄縣', replacedOn: MUNICIPALITIES_2010, change: '合併升格' }],
  },
  { code: '10002', name: '宜蘭縣', english: 'Yilan County', shortNames: ['宜蘭'], predecessors: [] },
  { code: '10004', name: '新竹縣', english: 'Hsinchu County', shortNames: [], predecessors: [] },
  { code: '10005', name: '苗栗縣', english: 'Miaoli County', shortNames: ['苗栗'], predecessors: [] },
  { code: '10007', name: '彰化縣', english: 'Changhua County', shortNames: ['彰化'], predecessors: [] },
  { code: '10008', name: '南投縣', english: 'Nantou County', shortNames: ['南投'], predecessors: [] },
  { code: '10009', name: '雲林縣', english: 'Yunlin County', shortNames: ['雲林'], predecessors: [] },
  { code: '10010', name: '嘉義縣', english: 'Chiayi County', shortNames: [], predecessors: [] },
  { code: '10013', name: '屏東縣', english: 'Pingtung County', shortNames: ['屏東'], predecessors: [] },
  { code: '10014', name: '臺東縣', english: 'Taitung County', shortNames: ['臺東'], predecessors: [] },
  { code: '10015', name: '花蓮縣', english: 'Hualien County', shortNames: ['花蓮'], predecessors: [] },
  { code: '10016', name: '澎湖縣', english: 'Penghu County', shortNames: ['澎湖'], predecessors: [] },
  { code: '10017', name: '基隆市', english: 'Keelung City', shortNames: ['基隆'], predecessors: [] },
  { code: '10018', name: '新竹市', english: 'Hsinchu City', shortNames: [], predecessors: [] },
  { code: '10020', name: '嘉義市', english: 'Chiayi City', shortNames: [], predecessors: [] },
  { code: '09020', name: '金門縣', english: 'Kinmen County', shortNames: ['金門'], predecessors: [] },
  { code: '09007', name: '連江縣', english: 'Lienchiang County', shortNames: ['連江', '馬祖'], predecessors: [] },
];

const byCode = new Map(COUNTIES.map((c) => [c.code, c]));

/**
 * Bring a place name to one spelling: 台 → 臺, no spaces, and without the
 * column suffixes the sources add (`新北市_統計`, `新北市-元`).
 */
export function normaliseName(raw: string): string {
  return raw
    // \s also covers the full-width space U+3000.
    .replace(/\s/g, '')
    .replace(/[_-](統計|元)$/, '')
    .replaceAll('台', '臺');
}

const NATIONAL_NAMES = new Set(['區域別總計', '總計', '臺灣地區', '全國']);

/** Every exact name (current or former) that identifies one region. */
const regionByName = new Map<string, RegionCode>([
  ...COUNTIES.flatMap((c) => [
    [c.name, c.code] as const,
    ...c.predecessors.map((p) => [p.name, c.code] as const),
  ]),
  ...[...NATIONAL_NAMES].map((n) => [n, NATIONAL] as const),
]);

/**
 * Map a region name from a statistics table to its current code.
 * Former county names resolve to the county that absorbed them.
 * Returns undefined for names that are not a county (so callers can report them).
 */
export function regionCodeForName(raw: string): RegionCode | undefined {
  return regionByName.get(normaliseName(raw));
}

export function countyByCode(code: string): County | undefined {
  return byCode.get(code);
}

export function isCountyCode(code: string): boolean {
  return byCode.has(code);
}

/** Every phrase that tags a news item with this county, longest first. */
export function newsKeywords(county: County): string[] {
  return [county.name, ...county.predecessors.map((p) => p.name), ...county.shortNames].sort(
    (a, b) => b.length - a.length,
  );
}

/**
 * Which counties a piece of text talks about, in registry order.
 * Text that names no county belongs to the whole country (the original
 * `過濾.py` called this group 其他).
 */
export function countiesMentioned(text: string): string[] {
  const normalised = normaliseName(text);
  return COUNTIES.filter((c) => newsKeywords(c).some((k) => normalised.includes(k))).map(
    (c) => c.code,
  );
}

/** One line describing how a county came to be, or undefined when it never changed. */
export function reorganisationNote(county: County): string | undefined {
  if (county.predecessors.length === 0) return undefined;
  const p = county.predecessors[0];
  if (!p) return undefined;
  return p.change === '升格'
    ? `${p.replacedOn} 由${p.name}升格為${county.name}`
    : `${p.replacedOn} 由${p.name}與原${county.name}合併升格`;
}
