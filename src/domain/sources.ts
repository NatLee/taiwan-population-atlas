/**
 * Where every number and boundary comes from, with its licence.
 * The fetch script (scripts/data/fetch.ts) reads the dataset ids from here and the
 * app shows the same list in its footer, so the attribution cannot drift.
 */

export interface Licence {
  name: string;
  url: string;
}

export const OPEN_GOVERNMENT_DATA_LICENCE: Licence = {
  name: '政府資料開放授權條款－第 1 版',
  url: 'https://data.gov.tw/license',
};

export const CC_BY_SA_4: Licence = {
  name: 'CC BY-SA 4.0',
  url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.zh-hant',
};

export interface Source {
  title: string;
  publisher: string;
  /** Landing page a reader can open. */
  url: string;
  licence: Licence;
  /** data.gov.tw dataset id, when the source is published there. */
  dataGovTwId?: number;
}

export const SOURCES = {
  'moi-population': {
    title: '人口增加─按區域別分',
    publisher: '內政部',
    url: 'https://data.gov.tw/dataset/14223',
    dataGovTwId: 14223,
    licence: OPEN_GOVERNMENT_DATA_LICENCE,
  },
  'dgbas-disposable-income': {
    title: '家庭收支調查－平均每戶可支配所得按區域別分',
    publisher: '行政院主計總處',
    url: 'https://data.gov.tw/dataset/9415',
    dataGovTwId: 9415,
    licence: OPEN_GOVERNMENT_DATA_LICENCE,
  },
  'dgbas-savings': {
    title: '家庭收支調查－平均每戶儲蓄按區域別分',
    publisher: '行政院主計總處',
    url: 'https://data.gov.tw/dataset/9416',
    dataGovTwId: 9416,
    licence: OPEN_GOVERNMENT_DATA_LICENCE,
  },
  'dgbas-total-income': {
    title: '家庭收支調查－平均每戶所得總額按區域別分',
    publisher: '行政院主計總處',
    url: 'https://data.gov.tw/dataset/9417',
    dataGovTwId: 9417,
    licence: OPEN_GOVERNMENT_DATA_LICENCE,
  },
  'dgbas-income-receipts': {
    title: '家庭收支調查－平均每戶所得收入總計按區域別分',
    publisher: '行政院主計總處',
    url: 'https://data.gov.tw/dataset/9418',
    dataGovTwId: 9418,
    licence: OPEN_GOVERNMENT_DATA_LICENCE,
  },
  'dgbas-consumption': {
    title: '家庭收支調查－平均每戶消費支出按區域別分',
    publisher: '行政院主計總處',
    url: 'https://data.gov.tw/dataset/9420',
    dataGovTwId: 9420,
    licence: OPEN_GOVERNMENT_DATA_LICENCE,
  },
  'wikipedia-events': {
    title: '維基百科「YYYY年臺灣」條目的大事記',
    publisher: '維基百科貢獻者',
    // Each year has its own page; the events file records the exact page and revision.
    url: 'https://zh.wikipedia.org/',
    licence: CC_BY_SA_4,
  },
  'moi-boundaries': {
    title: '直轄市、縣市界線（TWD97 經緯度），經 taiwan-atlas 轉成 TopoJSON',
    publisher: '內政部國土測繪中心',
    url: 'https://data.gov.tw/dataset/7442',
    dataGovTwId: 7442,
    licence: OPEN_GOVERNMENT_DATA_LICENCE,
  },
} as const satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;

/** Wikipedia page that lists the events of one year. */
export function wikipediaYearTitle(year: number): string {
  return `${year}年臺灣`;
}

export function wikipediaYearUrl(year: number, revision?: number): string {
  const base = `https://zh.wikipedia.org/wiki/${encodeURIComponent(wikipediaYearTitle(year))}`;
  return revision ? `${base}?oldid=${revision}` : base;
}
