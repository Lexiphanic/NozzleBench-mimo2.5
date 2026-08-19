/**
 * Gyroid infill pattern.
 *
 * Produces organic, isotropic curves. The 2D projection uses
 * sin(x)*cos(y) + sin(y)*cos(x) which simplifies to sin(x+y),
 * giving clean periodic curves at 45°.
 *
 * @param scale - wave frequency multiplier (default 1)
 * @param threshold - value above which is considered filled (default -0.3)
 */
import type { InfillPattern } from "@NozzleBench/plugin-sdk";

const DEFAULTS = { scale: 1, threshold: -0.3 };

const gyroidDensity = (
  x: number,
  y: number,
  params?: Record<string, unknown>,
): number => {
  const scale = (params?.scale as number) ?? DEFAULTS.scale;
  const threshold = (params?.threshold as number) ?? DEFAULTS.threshold;

  const val = Math.sin(x * scale) * Math.cos(y * scale) +
    Math.sin(y * scale) * Math.cos(x * scale);

  return val >= threshold ? 1 : 0;
};

export const GyroidPattern: InfillPattern = {
  id: "gyroid",
  name: "Gyroid",
  version: 1,
  defaultParams: { ...DEFAULTS },
  density: gyroidDensity,
};
