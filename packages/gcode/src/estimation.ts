import type { ToolpathSegment, PrintEstimate } from "./types";
import { filamentArea, extrusionArea } from "./types";

/**
 * Estimate print time and filament usage for a list of segments.
 * Accuracy target: within 5% of final G-code parse by using feedrate
 * and extrusion volume calculations.
 */
export function estimateSegment(
  segments: ToolpathSegment[],
  options?: {
    filamentDiameterMm?: number;
    nozzleDiameterMm?: number;
    layerHeightMm?: number;
  },
): PrintEstimate {
  const filamentDiameter = options?.filamentDiameterMm ?? 1.75;
  const nozzleDiameter = options?.nozzleDiameterMm ?? 0.4;
  const layerHeight = options?.layerHeightMm ?? 0.2;

  let totalTime = 0;
  let totalFilament = 0;
  let totalVolume = 0;
  let lastF = 0;

  const fArea = filamentArea(filamentDiameter);
  const eArea = extrusionArea(nozzleDiameter, layerHeight);

  for (const seg of segments) {
    const f = seg.start.f || lastF;
    if (f > 0) lastF = f;

    // Distance
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    const dz = seg.end.z - seg.start.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Time from feedrate (mm/min → seconds)
    if (f > 0 && distance > 0) {
      totalTime += (distance / f) * 60;
    }

    // E delta is the difference between end and start (cumulative E)
    const eDelta = seg.end.e - seg.start.e;
    if (eDelta > 0) {
      totalFilament += eDelta;
      totalVolume += eDelta * fArea;
    }
  }

  return {
    timeSeconds: totalTime,
    filamentMm: totalFilament,
    filamentVolumeMm3: totalVolume,
  };
}

/**
 * Estimate print time breakdown by feature type.
 * Returns a map of feature type → print estimate.
 */
export function estimateByFeatureType(
  segments: ToolpathSegment[],
  options?: {
    filamentDiameterMm?: number;
    nozzleDiameterMm?: number;
    layerHeightMm?: number;
  },
): Map<string, PrintEstimate> {
  const result = new Map<string, PrintEstimate>();
  const byType = new Map<string, ToolpathSegment[]>();

  for (const seg of segments) {
    const type = seg.featureType;
    if (!byType.has(type)) {
      byType.set(type, []);
    }
    byType.get(type)!.push(seg);
  }

  for (const [type, typeSegments] of byType) {
    result.set(type, estimateSegment(typeSegments, options));
  }

  return result;
}

/**
 * Validate estimate accuracy against a reference (final G-code parse).
 * Returns the relative error as a fraction (0.0 = perfect).
 */
export function estimateAccuracy(
  estimate: PrintEstimate,
  reference: PrintEstimate,
): { timeError: number; filamentError: number; volumeError: number } {
  return {
    timeError: reference.timeSeconds > 0
      ? Math.abs(estimate.timeSeconds - reference.timeSeconds) / reference.timeSeconds
      : 0,
    filamentError: reference.filamentMm > 0
      ? Math.abs(estimate.filamentMm - reference.filamentMm) / reference.filamentMm
      : 0,
    volumeError: reference.filamentVolumeMm3 > 0
      ? Math.abs(estimate.filamentVolumeMm3 - reference.filamentVolumeMm3) / reference.filamentVolumeMm3
      : 0,
  };
}
