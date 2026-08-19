/**
 * Honeycomb (hexagonal) infill pattern.
 *
 * Uses three families of parallel lines at 0°, 60°, 120° with hex-appropriate
 * spacing to produce a hexagonal lattice. Walls are filled where a point is
 * within `wallThickness/2` of any line.
 *
 * For pointy-top hexagons with circumradius `cellRadius`:
 * - Vertical walls: perpendicular spacing = 3/2 * cellRadius
 * - 60°/120° walls: perpendicular spacing = 3 * cellRadius
 *
 * @param cellRadius - circumradius of each hex cell in mm (default 3)
 * @param wallThickness - wall thickness in mm (default 0.4)
 */
import type { InfillPattern } from "@NozzleBench/plugin-sdk";

const DEFAULTS = { cellRadius: 3, wallThickness: 0.4 };

/**
 * Distance from a point to the nearest of a set of parallel lines
 * at `angle` radians, spaced `spacing` apart.
 */
const lineDist = (x: number, y: number, angle: number, spacing: number): number => {
  const proj = -Math.sin(angle) * x + Math.cos(angle) * y;
  const mod = ((proj % spacing) + spacing) % spacing;
  return Math.min(mod, spacing - mod);
};

const honeycombDensity = (
  x: number,
  y: number,
  params?: Record<string, unknown>,
): number => {
  const cellRadius = (params?.cellRadius as number) ?? DEFAULTS.cellRadius;
  const wallThickness =
    (params?.wallThickness as number) ?? DEFAULTS.wallThickness;
  if (cellRadius <= 0) return 1;

  const halfT = wallThickness / 2;

  // lineDist takes the line direction angle; the perpendicular is (-sin, cos).
  // For vertical lines (up/down), line direction = π/2.
  // For 60° lines, direction = π/3; for 120° lines, direction = 2π/3.
  // Family 1: vertical walls, perpendicular spacing = 3/2 * R
  const d0 = lineDist(x, y, Math.PI / 2, 1.5 * cellRadius);
  // Family 2: 60° walls, perpendicular spacing = 3 * R
  const d60 = lineDist(x, y, Math.PI / 3, 3 * cellRadius);
  // Family 3: 120° walls, perpendicular spacing = 3 * R
  const d120 = lineDist(x, y, (2 * Math.PI) / 3, 3 * cellRadius);

  return d0 <= halfT || d60 <= halfT || d120 <= halfT ? 1 : 0;
};

export const HoneycombPattern: InfillPattern = {
  id: "honeycomb",
  name: "Honeycomb",
  version: 1,
  defaultParams: { ...DEFAULTS },
  density: honeycombDensity,
};
