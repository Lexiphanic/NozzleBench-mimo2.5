// Core data types for the G-code package

/** Feature type classification for toolpath segments */
export type FeatureType =
  | "wall-outer"
  | "wall-inner"
  | "infill"
  | "support"
  | "support-interface"
  | "bridge"
  | "top-surface"
  | "bottom-surface"
  | "ironing"
  | "skirt"
  | "brim"
  | "travel"
  | "seam"
  | "unknown";

/** A parsed G-code command */
export interface GCodeCommand {
  /** Line number in source (0-based) */
  line: number;
  /** Raw text of the line */
  raw: string;
  /** G or M command number */
  command?: number;
  /** Parameters as key-value pairs */
  params: Record<string, number>;
  /** Comment text if present */
  comment?: string;
}

/** Parsed toolpath point with position and metadata */
export interface ToolpathPoint {
  x: number;
  y: number;
  z: number;
  e: number; // extrusion delta
  f: number; // feedrate (mm/min)
}

/** A single toolpath segment (one continuous extrusion move) */
export interface ToolpathSegment {
  start: ToolpathPoint;
  end: ToolpathPoint;
  featureType: FeatureType;
  /** Color for preview rendering (hex string e.g. "#FF0000") */
  color: string;
}

/** A layer in the toolpath */
export interface ToolpathLayer {
  z: number;
  segments: ToolpathSegment[];
}

/** Estimated print statistics for a segment or layer */
export interface PrintEstimate {
  /** Print time in seconds */
  timeSeconds: number;
  /** Filament length in mm */
  filamentMm: number;
  /** Filament volume in mm³ */
  filamentVolumeMm3: number;
}

/** Seam position on a perimeter */
export interface SeamPosition {
  x: number;
  y: number;
  z: number;
  layerIndex: number;
  segmentIndex: number;
  /** User override for seam position */
  override?: "nearest" | "aligned" | "random" | "user";
}

/** Complete preview data model built from parsed G-code */
export interface PreviewModel {
  layers: ToolpathLayer[];
  totalTimeSeconds: number;
  totalFilamentMm: number;
  totalFilamentVolumeMm3: number;
  seamPositions: SeamPosition[];
}

/** Feature type color map for preview rendering */
export const FEATURE_COLORS: Record<FeatureType, string> = {
  "wall-outer": "#FF4444",
  "wall-inner": "#FF8844",
  "infill": "#44FF44",
  "support": "#8888FF",
  "support-interface": "#8844FF",
  "bridge": "#FFFF44",
  "top-surface": "#44FFFF",
  "bottom-surface": "#4488FF",
  "ironing": "#CC88FF",
  "skirt": "#888888",
  "brim": "#888888",
  travel: "#333333",
  seam: "#FFFFFF",
  unknown: "#AAAAAA",
};

/** Nozzle diameter default (mm) */
export const DEFAULT_NOZZLE_DIAMETER = 0.4;

/** Default layer height (mm) */
export const DEFAULT_LAYER_HEIGHT = 0.2;

/** Default filament diameter (mm) */
export const DEFAULT_FILAMENT_DIAMETER = 1.75;

/** Filament cross-sectional area (mm²) */
export function filamentArea(
  diameterMm: number = DEFAULT_FILAMENT_DIAMETER,
): number {
  return Math.PI * (diameterMm / 2) ** 2;
}

/** Extrusion width to area conversion (simplified rectangular model) */
export function extrusionArea(
  widthMm: number,
  heightMm: number,
): number {
  return widthMm * heightMm;
}

/** Distance between two points in 3D */
export function distance3D(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Distance between two points in 2D (XY plane) */
export function distance2D(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}
