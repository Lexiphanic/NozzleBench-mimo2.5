// @NozzleBench/gcode - G-code parsing, preview, estimation, and seam painting

// Types and constants
export type {
  GCodeCommand,
  ToolpathPoint,
  ToolpathSegment,
  ToolpathLayer,
  PreviewModel,
  PrintEstimate,
  SeamPosition,
  FeatureType,
} from "./types";
export {
  FEATURE_COLORS,
  DEFAULT_NOZZLE_DIAMETER,
  DEFAULT_LAYER_HEIGHT,
  DEFAULT_FILAMENT_DIAMETER,
  filamentArea,
  extrusionArea,
  distance3D,
  distance2D,
} from "./types";

// Parser
export { parseLine, parseGCode, classifyFeatureType } from "./parser";

// Preview model
export {
  buildPreviewModel,
  getLayer,
  getSegmentsByFeature,
  getZRange,
} from "./preview";

// Estimation
export {
  estimateSegment,
  estimateByFeatureType,
  estimateAccuracy,
} from "./estimation";

// Seam painting
export {
  calculateSeamPositions,
  updateSeamPosition,
  getSeamPositionsForLayer,
} from "./seam";
