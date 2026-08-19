/**
 * Grid infill pattern.
 *
 * Classic grid of perpendicular lines. Line spacing is controlled by
 * the `spacing` parameter (default 4mm).
 *
 * @param spacing - distance between parallel lines in mm (default 4)
 * @param lineWidth - width of each line in mm (default 0.4)
 */
import type { InfillPattern } from "@NozzleBench/plugin-sdk";

const DEFAULTS = { spacing: 4, lineWidth: 0.4 };

/** Distance from `v` to the nearest integer multiple of `step`. */
const distToGridLine = (v: number, step: number): number => {
  const mod = ((v % step) + step) % step;
  return Math.min(mod, step - mod);
};

const gridDensity = (
  x: number,
  y: number,
  params?: Record<string, unknown>,
): number => {
  const spacing = (params?.spacing as number) ?? DEFAULTS.spacing;
  const lineWidth = (params?.lineWidth as number) ?? DEFAULTS.lineWidth;
  if (spacing <= 0) return 1;

  const halfW = lineWidth / 2;
  return distToGridLine(x, spacing) <= halfW ||
    distToGridLine(y, spacing) <= halfW
    ? 1
    : 0;
};

export const GridPattern: InfillPattern = {
  id: "grid",
  name: "Grid",
  version: 1,
  defaultParams: { ...DEFAULTS },
  density: gridDensity,
};
