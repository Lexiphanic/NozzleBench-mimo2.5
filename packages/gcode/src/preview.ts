import type {
  GCodeCommand,
  ToolpathLayer,
  ToolpathSegment,
  ToolpathPoint,
  FeatureType,
  PreviewModel,
  SeamPosition,
} from "./types";
import { FEATURE_COLORS } from "./types";
import { classifyFeatureType } from "./parser";

/**
 * Build a PreviewModel from parsed G-code commands.
 * Groups moves into layers by Z height and segments by feature type.
 */
export function buildPreviewModel(commands: GCodeCommand[]): PreviewModel {
  // Track current state
  let x = 0,
    y = 0,
    z = 0,
    e = 0,
    f = 0;
  let absoluteE = true;
  let currentFeatureType: FeatureType = "unknown";
  let eTotal = 0;

  // Accumulate moves grouped by layer Z
  const layerMap = new Map<number, ToolpathSegment[]>();
  const allSegments: ToolpathSegment[] = [];

  for (const cmd of commands) {
    // Handle M82/M83 extruder absolute/relative mode
    if (cmd.command === 82) {
      absoluteE = true;
      continue;
    }
    if (cmd.command === 83) {
      absoluteE = false;
      continue;
    }

    // Handle G92 set position
    if (cmd.command === 92) {
      if (cmd.params["E"] !== undefined) e = cmd.params["E"];
      continue;
    }

    // Classify feature type from comments
    const classified = classifyFeatureType(cmd);
    if (classified && isValidFeatureType(classified)) {
      currentFeatureType = classified as FeatureType;
    }

    // G0/G1 linear moves
    if (cmd.command === 0 || cmd.command === 1) {
      const newX = cmd.params["X"] ?? x;
      const newY = cmd.params["Y"] ?? y;
      const newZ = cmd.params["Z"] ?? z;
      const newF = cmd.params["F"] ?? f;
      let newE = cmd.params["E"];

      // Skip if position unchanged
      if (newX === x && newY === y && newZ === z) {
        if (newF !== undefined) f = newF;
        continue;
      }

      // Calculate E delta (save old E before updating)
      const oldE = e;
      let eDelta = 0;
      if (newE !== undefined) {
        eDelta = absoluteE ? newE - e : newE;
        e = absoluteE ? newE : e + newE;
      }

      // Track Z changes → layer transitions
      if (newZ !== z) {
        z = newZ;
      }

      const start: ToolpathPoint = { x, y, z, e: oldE, f: f };
      const end: ToolpathPoint = { x: newX, y: newY, z: newZ, e, f: newF };

      const featureType: FeatureType = eDelta > 0 ? currentFeatureType : "travel";
      const color = FEATURE_COLORS[featureType];

      const segment: ToolpathSegment = { start, end, featureType, color };
      allSegments.push(segment);

      // Group by layer Z
      const layerZ = Math.round(newZ * 1000) / 1000; // round to micron
      if (!layerMap.has(layerZ)) {
        layerMap.set(layerZ, []);
      }
      layerMap.get(layerZ)!.push(segment);

      // Update position
      x = newX;
      y = newY;
      f = newF;
      if (newE !== undefined) {
        // e already updated above
      }

      // Track total extrusion
      if (eDelta > 0) {
        eTotal += eDelta;
      }
    }
  }

  // Build layers sorted by Z
  const layers: ToolpathLayer[] = [...layerMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([z, segments]) => ({ z, segments }));

  // Calculate estimates
  const timeSeconds = estimatePrintTime(allSegments);
  const filamentMm = eTotal;
  const filamentVolumeMm3 = filamentMm * Math.PI * (1.75 / 2) ** 2;

  return {
    layers,
    totalTimeSeconds: timeSeconds,
    totalFilamentMm: filamentMm,
    totalFilamentVolumeMm3: filamentVolumeMm3,
    seamPositions: [],
  };
}

/** Check if a string is a valid FeatureType */
function isValidFeatureType(s: string): boolean {
  return (
    s === "wall-outer" ||
    s === "wall-inner" ||
    s === "infill" ||
    s === "support" ||
    s === "support-interface" ||
    s === "bridge" ||
    s === "top-surface" ||
    s === "bottom-surface" ||
    s === "ironing" ||
    s === "skirt" ||
    s === "brim" ||
    s === "travel" ||
    s === "seam" ||
    s === "unknown"
  );
}

/**
 * Estimate total print time from segments.
 * Uses feedrate and travel distance for each segment.
 * Travel moves use the last known feedrate.
 */
function estimatePrintTime(segments: ToolpathSegment[]): number {
  let totalTime = 0;
  let lastF = 0;

  for (const seg of segments) {
    const f = seg.start.f || lastF;
    if (f > 0) lastF = f;

    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    const dz = seg.end.z - seg.start.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // feedrate is mm/min
    if (f > 0 && distance > 0) {
      totalTime += (distance / f) * 60; // convert to seconds
    }
  }

  return totalTime;
}

/**
 * Get a specific layer from the preview model by index.
 */
export function getLayer(model: PreviewModel, index: number): ToolpathLayer | undefined {
  return model.layers[index];
}

/**
 * Get segments in a layer that match a given feature type.
 */
export function getSegmentsByFeature(
  layer: ToolpathLayer,
  featureType: FeatureType,
): ToolpathSegment[] {
  return layer.segments.filter((s) => s.featureType === featureType);
}

/**
 * Get the range of Z heights in the model.
 */
export function getZRange(model: PreviewModel): { min: number; max: number } {
  if (model.layers.length === 0) return { min: 0, max: 0 };
  return {
    min: model.layers[0].z,
    max: model.layers[model.layers.length - 1].z,
  };
}
