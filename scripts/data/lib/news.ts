import type { NewsEvent, NewsYear } from '../../../src/domain/atlas.ts';
import { countiesMentioned } from '../../../src/domain/counties.ts';
import { parseLegacyPeriod, yearOf } from '../../../src/domain/periods.ts';
import { dateEvent, type RawEvent } from './wikitext.ts';

/**
 * Tag each event with the counties it names (the job `過濾.py` did in 2017),
 * reading both the visible text and the pages it links to.
 */
export function tagEvents(events: readonly RawEvent[]): NewsEvent[] {
  return events.map(({ date, text, links = [] }) => ({
    date,
    text,
    counties: countiesMentioned([text, ...links].join(' ')),
  }));
}

type LegacyEvents = Record<string, Record<string, string[]>>;

/**
 * The 2017 `臺灣大事件.json`: `{ "2014年1月": { "臺北市": [...], "其他": [...] } }`.
 * An event that named two counties was stored twice, so the lists are merged by
 * text and re-tagged with the same rule as the fresh data.
 */
export function convertLegacyEvents(json: LegacyEvents): Map<number, NewsYear> {
  const byYear = new Map<number, Map<string, RawEvent>>();
  for (const [label, groups] of Object.entries(json)) {
    const period = parseLegacyPeriod(label);
    if (!period) throw new Error(`Unrecognised month in the 2017 events: ${label}`);
    const year = yearOf(period);
    const month = Number(period.slice(5, 7));
    const seen = byYear.get(year) ?? new Map<string, RawEvent>();
    for (const text of Object.values(groups).flat()) {
      const clean = text.trim();
      const date = dateEvent(year, clean, month);
      if (clean && date && !seen.has(clean)) seen.set(clean, { date, text: clean });
    }
    byYear.set(year, seen);
  }
  const out = new Map<number, NewsYear>();
  for (const [year, events] of byYear) {
    const sorted = [...events.values()].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length > 0) out.set(year, { input: 'legacy-2017', events: tagEvents(sorted) });
  }
  return out;
}
