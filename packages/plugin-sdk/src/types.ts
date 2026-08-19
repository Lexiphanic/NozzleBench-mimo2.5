/**
 * Core types for the NozzleBench plugin SDK.
 *
 * These types define the contracts that plugins and core patterns implement.
 * The infill pattern system is the first consumer of this SDK.
 */

/** 2D point used for spatial queries. */
export interface Point2D {
  readonly x: number;
  readonly y: number;
}

/** Axis-aligned bounding box. */
export interface Bounds2D {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * Per-point infill density query.
 * Returns a value in [0, 1] indicating how much infill material
 * should be present at the given point (0 = empty, 1 = fully filled).
 */
export type InfillDensityFn = (x: number, y: number) => number;

/**
 * A registered infill pattern.
 */
export interface InfillPattern {
  /** Unique machine-readable name (e.g. "grid", "gyroid"). */
  readonly id: string;
  /** Human-readable display name (e.g. "Grid", "Gyroid"). */
  readonly name: string;
  /** Pattern version for forward compatibility. */
  readonly version: number;
  /** Pattern-specific default parameters. */
  readonly defaultParams: Record<string, unknown>;
  /**
   * Generate infill density at a point.
   *
   * @param x - world-space x coordinate
   * @param y - world-space y coordinate
   * @param params - pattern-specific parameters (overrides defaults)
   * @returns density in [0, 1]
   */
  density(x: number, y: number, params?: Record<string, unknown>): number;
}

/**
 * Wall/infill ordering mode.
 */
export enum InfillOrder {
  InnerFirst = "inner-first",
  OuterFirst = "outer-first",
}

/**
 * Configuration for the infill system.
 */
export interface InfillConfig {
  /** Infill density 0–100 (integer percent). */
  density: number;
  /**
   * Infill angle in degrees.
   * Applied as a rotation to every layer's infill.
   * For per-layer angle control, use the `angleFn` override.
   */
  angle: number;
  /** Wall/infill ordering. */
  order: InfillOrder;
  /**
   * Infill-to-perimeter overlap in mm.
   * Controls how far infill lines extend past the perimeter boundary
   * to ensure bonding between walls and infill.
   */
  overlap: number;
  /**
   * Number of solid top layers (fully filled, no sparse infill).
   */
  solidTopLayers: number;
  /**
   * Number of solid bottom layers (fully filled, no sparse infill).
   */
  solidBottomLayers: number;
  /** Layer height in mm (needed for layer count calculations). */
  layerHeight: number;
  /**
   * Optional per-layer angle function.
   * Given a layer index (0-based), returns the infill angle for that layer.
   * Overrides the fixed `angle` field when provided.
   */
  angleFn?: (layerIndex: number) => number;
  /** Pattern-specific parameters keyed by pattern id. */
  patternParams: Record<string, Record<string, unknown>>;
}

/**
 * Default infill configuration.
 */
export const DEFAULT_INFILL_CONFIG: InfillConfig = {
  density: 20,
  angle: 45,
  order: InfillOrder.InnerFirst,
  overlap: 0.15,
  solidTopLayers: 3,
  solidBottomLayers: 3,
  layerHeight: 0.2,
  patternParams: {},
};
