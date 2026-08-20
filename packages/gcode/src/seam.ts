import type { ToolpathLayer, ToolpathSegment, SeamPosition, FeatureType } from "./types";
import { distance2D } from "./types";

/**
 * Calculate seam positions for a layer.
 * Finds the transition point between outer wall segments where
 * the extruder starts/stops — the natural seam location.
 *
 * Strategies:
 * - "nearest": seam closest to current nozzle position
 * - "aligned": same relative position on each loop
 * - "random": random position per loop
 */
export function calculateSeamPositions(
  layers: ToolpathLayer[],
  strategy: "nearest" | "aligned" | "random" = "aligned",
  nozzleX: number = 0,
  nozzleY: number = 0,
): SeamPosition[] {
  const seams: SeamPosition[] = [];

  for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
    const layer = layers[layerIdx];
    const outerWalls = layer.segments.filter(
      (s) => s.featureType === ("wall-outer" as FeatureType),
    );

    if (outerWalls.length === 0) continue;

    // Find loops: groups of connected segments
    const loops = findLoops(outerWalls);

    for (const loop of loops) {
      if (loop.length === 0) continue;

      const seamPoint = selectSeamPoint(loop, strategy, nozzleX, nozzleY);
      seams.push({
        x: seamPoint.x,
        y: seamPoint.y,
        z: seamPoint.z,
        layerIndex: layerIdx,
        segmentIndex: seamPoint.segmentIndex,
        override: strategy,
      });
    }
  }

  return seams;
}

/**
 * Find connected loops in a set of outer wall segments.
 * Segments are "connected" if the end of one matches the start of another.
 */
function findLoops(segments: ToolpathSegment[]): ToolpathSegment[][] {
  if (segments.length === 0) return [];

  const used = new Set<number>();
  const loops: ToolpathSegment[][] = [];

  for (let i = 0; i < segments.length; i++) {
    if (used.has(i)) continue;

    const loop: ToolpathSegment[] = [segments[i]];
    used.add(i);

    // Follow the chain forward
    let changed = true;
    while (changed) {
      changed = false;
      const last = loop[loop.length - 1];
      for (let j = 0; j < segments.length; j++) {
        if (used.has(j)) continue;
        if (pointsClose(last.end, segments[j].start, 0.01)) {
          loop.push(segments[j]);
          used.add(j);
          changed = true;
          break;
        }
      }
    }

    loops.push(loop);
  }

  return loops;
}

/**
 * Select the best seam point from a loop based on strategy.
 */
function selectSeamPoint(
  loop: ToolpathSegment[],
  strategy: "nearest" | "aligned" | "random",
  nozzleX: number,
  nozzleY: number,
): { x: number; y: number; z: number; segmentIndex: number } {
  const candidates: Array<{
    x: number;
    y: number;
    z: number;
    segmentIndex: number;
    score: number;
  }> = [];

  for (let i = 0; i < loop.length; i++) {
    const seg = loop[i];
    candidates.push({
      x: seg.start.x,
      y: seg.start.y,
      z: seg.start.z,
      segmentIndex: i,
      score: 0,
    });
  }

  if (candidates.length === 0) {
    // Fallback: use first segment start
    const seg = loop[0];
    return { x: seg.start.x, y: seg.start.y, z: seg.start.z, segmentIndex: 0 };
  }

  switch (strategy) {
    case "nearest": {
      // Pick candidate closest to current nozzle position
      for (const c of candidates) {
        c.score = distance2D(
          { x: c.x, y: c.y },
          { x: nozzleX, y: nozzleY },
        );
      }
      candidates.sort((a, b) => a.score - b.score);
      break;
    }
    case "aligned": {
      // Pick at ~20% along the loop (consistent relative position)
      const idx = Math.floor(loop.length * 0.2);
      const c = candidates[Math.min(idx, candidates.length - 1)];
      return c;
    }
    case "random": {
      // Random position in the loop
      const idx = Math.floor(Math.random() * candidates.length);
      return candidates[idx];
    }
  }

  return candidates[0];
}

/**
 * Check if two 2D points are within a tolerance.
 */
function pointsClose(
  a: { x: number; y: number },
  b: { x: number; y: number },
  tolerance: number,
): boolean {
  return distance2D(a, b) < tolerance;
}

/**
 * Update seam positions for a specific layer.
 * Allows user to override seam position for individual regions.
 */
export function updateSeamPosition(
  seams: SeamPosition[],
  layerIndex: number,
  segmentIndex: number,
  override: "nearest" | "aligned" | "random" | "user",
): SeamPosition[] {
  return seams.map((seam) => {
    if (seam.layerIndex === layerIndex && seam.segmentIndex === segmentIndex) {
      return { ...seam, override };
    }
    return seam;
  });
}

/**
 * Get seam positions for a specific layer.
 */
export function getSeamPositionsForLayer(
  seams: SeamPosition[],
  layerIndex: number,
): SeamPosition[] {
  return seams.filter((s) => s.layerIndex === layerIndex);
}
