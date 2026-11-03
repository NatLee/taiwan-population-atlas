/**
 * Every data colour the app uses, for light and dark themes.
 *
 * The blue steps and the categorical hues are the validated reference palette of
 * the charting guidelines this project follows. The red arm of the diverging scale
 * was derived once from the categorical red (#e34948): same CIE-LCh hue, with the
 * lightness of the matching blue step, so both sides of zero get equally dark at
 * equal distances. palette.test.ts checks that symmetry.
 *
 * The 2017 page used a green→red ramp, which people with red–green colour
 * blindness cannot read. Blue↔red stays distinct for them.
 */
export type ThemeName = 'light' | 'dark';

/** Blue ramp, steps 100 → 700 (light → dark). */
export const BLUE = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'] as const;
/** Red ramp with the same lightness per step as BLUE (150, 300, 450, 500, 600, 700 are used). */
export const RED = {
  150: '#efc6c0',
  300: '#ef8177',
  450: '#cd4442',
  500: '#b83a39',
  600: '#902527',
  700: '#681317',
} as const;
export const BLUE_STEP = { 150: '#b7d3f6', 300: '#6da7ec', 450: '#2a78d6', 500: '#256abf', 600: '#184f95', 700: '#0d366b' } as const;

export interface ThemePalette {
  /** Low → high. */
  sequential: readonly string[];
  /** Most negative → zero → most positive. */
  diverging: readonly string[];
  /** Series colours for compared counties, assigned in this order and never cycled. */
  categorical: readonly string[];
  /** Fill behind the hatch for regions without data. */
  noData: string;
  noDataHatch: string;
}

export const PALETTES: Record<ThemeName, ThemePalette> = {
  light: {
    sequential: BLUE,
    diverging: [RED[700], RED[500], RED[300], RED[150], '#f0efec', BLUE_STEP[150], BLUE_STEP[300], BLUE_STEP[500], BLUE_STEP[700]],
    categorical: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'],
    noData: '#fcfcfb',
    noDataHatch: '#c3c2b7',
  },
  dark: {
    // In dark mode the low end sits near the dark surface and high values get brighter.
    sequential: [...BLUE].reverse(),
    diverging: [RED[150], RED[300], RED[450], RED[600], '#383835', BLUE_STEP[600], BLUE_STEP[450], BLUE_STEP[300], BLUE_STEP[150]],
    categorical: ['#3987e5', '#d95926', '#199e70', '#c98500'],
    noData: '#1a1a19',
    noDataHatch: '#52514e',
  },
};

/** How many counties can be compared at once: one categorical colour each. */
export const MAX_COMPARED = PALETTES.light.categorical.length;
