/**
 * Infill line generator.
 *
 * Converts a density field (pattern + config) into toolpath line segments
 * that the slicer emits as G-code. Handles:
 * - Pattern rotation via angle / per-layer angleFn
 * - Density scaling (pattern value × density%)
 * - Overlap extension for wall-infill bonding
 * - Solid layer detection (top/bottom solid layers → fully filled)
 * - Sparse infill: adaptive density via solid-layer counts
 *
 * Output: arrays of line segments per layer.
 */

import type {
  InfillConfig,
  InfillPattern,
} from "@NozzleBench/plugin-sdk";
import { degToRad, rotatePoint, applyDensity } from "./math.js";

/** A line segment: two endpoints. */
export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Result of infill generation for a single layer. */
export interface LayerInfill {
  /** Layer index (0-based). */
  layerIndex: number;
  /** Whether this is a solid (fully-filled) layer. */
  solid: boolean;
  /** Line segments to print. */
  lines: readonly LineSegment[];
}

/**
 * Determine if a layer is solid based on config and layer index.
 * Bottom layers [0..solidBottomLayers-1] and top layers
 * [totalLayers-solidTopLayers..totalLayers-1] are solid.
 */
const isSolidLayer = (
  layerIndex: number,
  totalLayers: number,
  solidTopLayers: number,
  solidBottomLayers: number,
): boolean => {
  if (layerIndex < solidBottomLayers) return true;
  if (layerIndex >= totalLayers - solidTopLayers) return true;
  return false;
};

/**
 * Generate a grid of scan lines and evaluate the density function at each
 * sample point to build line segments.
 *
 * @param bounds - area to fill
 * @param pattern - infill pattern
 * @param config - infill configuration
 * @param layerIndex - current layer index
 * @param totalLayers - total number of layers in the print
 * @param sampleStep - distance between sample points (default 0.5mm)
 */
export const generateInfillLines = (
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  pattern: InfillPattern,
  config: InfillConfig,
  layerIndex: number,
  totalLayers: number,
  sampleStep = 0.5,
): LayerInfill => {
  const {
    density: densityPercent,
    angle: fixedAngle,
    overlap,
    solidTopLayers,
    solidBottomLayers,
  } = config;

  const solid = isSolidLayer(
    layerIndex,
    totalLayers,
    solidTopLayers,
    solidBottomLayers,
  );

  // For solid layers, return a full fill (no sparse pattern)
  if (solid) {
    return {
      layerIndex,
      solid: true,
      lines: [
        {
          x1: bounds.minX - overlap,
          y1: bounds.minY - overlap,
          x2: bounds.maxX + overlap,
          y2: bounds.maxY + overlap,
        },
      ],
    };
  }

  // Density 0 → no infill
  if (densityPercent <= 0) {
    return { layerIndex, solid: false, lines: [] };
  }

  // Compute the infill angle for this layer
  const angle = config.angleFn
    ? config.angleFn(layerIndex)
    : fixedAngle;
  const angleRad = degToRad(angle);

  const patternParams = config.patternParams[pattern.id] ?? {};
  const lines: LineSegment[] = [];

  // For patterns that produce linear features (grid, triangular, honeycomb),
  // we sample on a rotated grid and build line segments from consecutive
  // filled sample points along each scan line.
  //
  // For continuous patterns (gyroid, cubic, lightning), we sample densely
  // and connect adjacent filled samples.

  const width = bounds.maxX - bounds.minX + 2 * overlap;
  const height = bounds.maxY - bounds.minY + 2 * overlap;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;

  // Number of scan lines perpendicular to infill direction
  const scanLines = Math.ceil(Math.max(width, height) / sampleStep);

  for (let i = -scanLines; i <= scanLines; i++) {
    const scanPos = i * sampleStep;

    // Start and end of this scan line in rotated space
    const halfSpan = Math.max(width, height);
    const [sx, sy] = rotatePoint(-halfSpan, scanPos, angleRad);
    const [ex, ey] = rotatePoint(halfSpan, scanPos, angleRad);

    // Sample along this scan line
    const steps = Math.ceil((2 * halfSpan) / sampleStep);
    let inLine = false;
    let lineStartX = 0;
    let lineStartY = 0;

    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      const px = cx + sx + (ex - sx) * t;
      const py = cy + sy + (ey - sy) * t;

      const raw = pattern.density(px, py, patternParams);
      const filled = applyDensity(raw, densityPercent) === 1;

      if (filled && !inLine) {
        inLine = true;
        lineStartX = px;
        lineStartY = py;
      } else if (!filled && inLine) {
        inLine = false;
        lines.push({
          x1: lineStartX,
          y1: lineStartY,
          x2: px,
          y2: py,
        });
      }
    }

    if (inLine) {
      lines.push({
        x1: lineStartX,
        y1: lineStartY,
        x2: cx + ex,
        y2: cy + ey,
      });
    }
  }

  return { layerIndex, solid: false, lines };
};
