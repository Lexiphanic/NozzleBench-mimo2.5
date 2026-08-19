/**
 * Infill system barrel export.
 *
 * Re-exports all infill patterns, the pattern registry,
 * configuration types, and the line generator.
 */

// Patterns
export {
  GridPattern,
  GyroidPattern,
  LightningPattern,
  HoneycombPattern,
  TriangularPattern,
  CubicPattern,
} from "./patterns/index.js";

// Math utilities
export { degToRad, rotatePoint, applyDensity, layerAngle } from "./math.js";

// Line generation
export { generateInfillLines } from "./generator.js";
export type { LineSegment, LayerInfill } from "./generator.js";

// Re-export plugin-sdk types consumed by the infill system
export {
  InfillOrder,
  DEFAULT_INFILL_CONFIG,
  registry,
} from "@NozzleBench/plugin-sdk";
export type {
  InfillConfig,
  InfillPattern,
  InfillDensityFn,
  Point2D,
  Bounds2D,
} from "@NozzleBench/plugin-sdk";
