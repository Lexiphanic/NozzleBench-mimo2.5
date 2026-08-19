/**
 * Math utilities for infill pattern generation.
 *
 * Provides rotation, density scaling, and solid-layer detection
 * used by every infill pattern.
 */

/** Convert degrees to radians. */
export const degToRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Rotate a point around the origin by the given angle (radians).
 * Returns [x', y'].
 */
export const rotatePoint = (
  x: number,
  y: number,
  angleRad: number,
): [number, number] => {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return [x * cos - y * sin, x * sin + y * cos];
};

/**
 * Apply density scaling to a pattern value.
 *
 * The raw pattern returns 0 or 1 (on/off).
 * Density maps this so that at density D%, a filled cell has a D% chance
 * of being filled. We use a threshold approach: the pattern value is
 * compared against (1 - density/100) to produce a binary result,
 * which gives the expected fill ratio.
 *
 * @param raw - raw pattern value in [0, 1]
 * @param density - percent 0–100
 * @returns 0 or 1
 */
export const applyDensity = (raw: number, density: number): number => {
  if (density <= 0) return 0;
  if (density >= 100) return 1;
  return raw >= 1 - density / 100 ? 1 : 0;
};

/**
 * Compute the infill angle (degrees) for a given layer.
 * Uses the per-layer function if provided, otherwise returns the fixed angle.
 */
export const layerAngle = (
  layerIndex: number,
  fixedAngle: number,
  angleFn?: (layerIndex: number) => number,
): number => {
  return angleFn ? angleFn(layerIndex) : fixedAngle;
};
