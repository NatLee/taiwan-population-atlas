import type { MetricId } from '../../../src/domain/metrics.ts';
import type { Period } from '../../../src/domain/periods.ts';
import type { RegionCode } from '../../../src/domain/counties.ts';

/** One number from one table cell, already mapped to a current county code. */
export interface ValueRecord {
  metric: MetricId;
  period: Period;
  region: RegionCode;
  value: number | null;
}

/** Every parser returns its records plus anything it could not understand. */
export interface ParseResult {
  records: ValueRecord[];
  /** Region names that matched no county (should stay empty; the build fails otherwise). */
  unknownRegions: string[];
}

/**
 * Read one statistics cell.
 *
 * Taiwanese official tables write 「-」 for "the value is zero" (數值為零). The data
 * agrees: in 39 of the 40 months where the Ministry of the Interior shows 「-」 for
 * a natural increase rate, the total rate equals the social rate.
 *
 * Empty cells mean "unknown". The 2017 JSON has 66 of them; most were 「-」 in the
 * source, but 14 hold real numbers in today's tables, so an empty cell cannot be
 * read as zero. Anything else that is not a number (「…」, 「x」) is also unknown.
 */
export function parseCell(raw: string | undefined): number | null {
  const cell = (raw ?? '').trim().replaceAll(',', '');
  if (cell === '-' || cell === '－') return 0;
  if (cell === '') return null;
  const value = Number(cell);
  return Number.isFinite(value) ? value : null;
}
