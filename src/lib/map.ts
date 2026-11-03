/** Zoom limits of the 2017 map: from the whole country up to 10×. */
export const ZOOM_EXTENT: [number, number] = [1, 10];
/** How much one press of the + / − buttons zooms. */
export const ZOOM_STEP = 1.6;
/** Pointer travel (px) below which a press counts as a click, not a pan. */
export const CLICK_DISTANCE = 4;
/** Space between the map and its frame. */
export const MAP_PADDING = 16;
/** SVG pattern id for counties without data (shared by the map and the legend). */
export const NO_DATA_PATTERN = 'no-data-hatch';
