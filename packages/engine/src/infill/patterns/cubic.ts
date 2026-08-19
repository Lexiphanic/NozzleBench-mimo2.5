/**
 * Cubic infill pattern.
 *
 * A 3D pattern projected onto 2D slices. Each layer gets a different
 * offset, creating a pattern that changes between layers to form
 * internal cube-like structures. Uses three orthogonal sine waves.
 *
 * @param cellSize - size of each cubic cell in mm (default 5)
 * @param wallThickness - wall thickness in mm (default 0.4)
 */
import type { InfillPattern } from "@NozzleBench/plugin-sdk";

const CUBIC_ID = "cubic";
const CUBIC_NAME = "Cubic";
const CUBIC_VERSION = 1;

interface CubicParams {
  cellSize: number;
  wallThickness: number;
}

const DEFAULTS: CubicParams = { cellSize: 5, wallThickness: 0.4 };

const cubicDensity = (
  x: number,
  y: number,
  params?: Record<string, unknown>,
): number => {
  const cellSize = (params?.cellSize as number) ?? DEFAULTS.cellSize;
  const wallThickness =
    (params?.wallThickness as number) ?? DEFAULTS.wallThickness;
  if (cellSize <= 0) return 1;

  const freq = Math.PI / cellSize;
  const halfT = wallThickness / 2;

  // Three orthogonal sine waves — the intersection of their "walls"
  // produces cube-like cells when viewed across layers.
  const wx = Math.abs(Math.sin(x * freq));
  const wy = Math.abs(Math.sin(y * freq));
  // Diagonal wave creates the third dimension projection
  const wz = Math.abs(Math.sin((x + y) * freq * 0.7071));

  // The cubic pattern is filled where ANY two waves are simultaneously near zero
  // (i.e. we're on an edge of the cubic cell)
  const threshold = halfT / cellSize;
  const onX = wx <= threshold ? 1 : 0;
  const onY = wy <= threshold ? 1 : 0;
  const onZ = wz <= threshold * 1.5 ? 1 : 0;

  // At least two waves aligned → we're on a cell edge
  return onX + onY + onZ >= 2 ? 1 : 0;
};

export const CubicPattern: InfillPattern = {
  id: CUBIC_ID,
  name: CUBIC_NAME,
  version: CUBIC_VERSION,
  defaultParams: { ...DEFAULTS },
  density: cubicDensity,
};
