/**
 * Triangular infill pattern.
 *
 * Three sets of parallel lines at 0°, 60°, and 120° forming a
 * triangular lattice. Provides isotropic in-plane strength.
 *
 * @param spacing - distance between parallel lines in mm (default 4)
 * @param lineWidth - width of each line in mm (default 0.4)
 */
import type { InfillPattern } from "@NozzleBench/plugin-sdk";

const DEFAULTS = { spacing: 4, lineWidth: 0.4 };

/** Distance from a point to the nearest of a set of parallel lines. */
const lineDist = (x: number, y: number, angle: number, spacing: number): number => {
  const proj = -Math.sin(angle) * x + Math.cos(angle) * y;
  const mod = ((proj % spacing) + spacing) % spacing;
  return Math.min(mod, spacing - mod);
};

const triangularDensity = (
  x: number,
  y: number,
  params?: Record<string, unknown>,
): number => {
  const spacing = (params?.spacing as number) ?? DEFAULTS.spacing;
  const lineWidth = (params?.lineWidth as number) ?? DEFAULTS.lineWidth;
  if (spacing <= 0) return 1;

  const halfW = lineWidth / 2;

  // lineDist takes line direction; perpendicular is (-sin, cos).
  // For horizontal lines: direction=0. For 60° lines: π/3. For 120° lines: 2π/3.
  const d0 = lineDist(x, y, 0, spacing);
  const d60 = lineDist(x, y, Math.PI / 3, spacing);
  const d120 = lineDist(x, y, (2 * Math.PI) / 3, spacing);

  return d0 <= halfW || d60 <= halfW || d120 <= halfW ? 1 : 0;
};

export const TriangularPattern: InfillPattern = {
  id: "triangular",
  name: "Triangular",
  version: 1,
  defaultParams: { ...DEFAULTS },
  density: triangularDensity,
};
