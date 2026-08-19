/**
 * Lightning infill pattern.
 *
 * Tree-like branching structure. Each cell has a pseudo-random seed point;
 * a point is filled if it's within `branchWidth` of any neighboring cell's
 * seed, creating angular branch connections.
 *
 * @param cellSize - Voronoi cell size in mm (default 6)
 * @param branchWidth - branch connection width in mm (default 2.0)
 */
import type { InfillPattern } from "@NozzleBench/plugin-sdk";

const DEFAULTS = { cellSize: 6, branchWidth: 2.0 };

/** Deterministic hash for pseudo-random seed offsets per cell. */
const hash2D = (ix: number, iy: number): [number, number] => {
  let h = ix * 374761393 + iy * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return [(h & 0xffff) / 0xffff - 0.5, ((h >> 16) & 0xffff) / 0xffff - 0.5];
};

const lightningDensity = (
  x: number,
  y: number,
  params?: Record<string, unknown>,
): number => {
  const cellSize = (params?.cellSize as number) ?? DEFAULTS.cellSize;
  const branchWidth = (params?.branchWidth as number) ?? DEFAULTS.branchWidth;
  if (cellSize <= 0) return 1;

  const cellX = Math.floor(x / cellSize);
  const cellY = Math.floor(y / cellSize);
  const localX = x / cellSize - cellX;
  const localY = y / cellSize - cellY;

  const [ox, oy] = hash2D(cellX, cellY);
  const seedX = 0.5 + ox;
  const seedY = 0.5 + oy;

  const dx = localX - seedX;
  const dy = localY - seedY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Check distance to neighboring cells' seeds too (for branch connections)
  let minDist = dist;
  for (let nx = -1; nx <= 1; nx++) {
    for (let ny = -1; ny <= 1; ny++) {
      if (nx === 0 && ny === 0) continue;
      const [nox, noy] = hash2D(cellX + nx, cellY + ny);
      const nsx = 0.5 + nox - (localX + nx);
      const nsy = 0.5 + noy - (localY + ny);
      const nd = Math.sqrt(nsx * nsx + nsy * nsy);
      if (nd < minDist) minDist = nd;
    }
  }

  return minDist <= branchWidth / cellSize ? 1 : 0;
};

export const LightningPattern: InfillPattern = {
  id: "lightning",
  name: "Lightning",
  version: 1,
  defaultParams: { ...DEFAULTS },
  density: lightningDensity,
};
