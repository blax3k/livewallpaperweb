export const DISPLAY_SCALE = 100;

export const toDisplay = (v: number) => Math.round(v * DISPLAY_SCALE);
export const toInternal = (v: number) => v / DISPLAY_SCALE;
