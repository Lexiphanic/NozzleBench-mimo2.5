/**
 * Core print profile: all parameters that describe how a part should be printed.
 * Profiles are data — validated, versioned, shareable.
 */
export interface PrintProfile {
  name: string;
  version: string;
  nozzleDiameter: number;       // mm
  filamentDiameter: number;     // mm
  layerHeight: number;          // mm
  firstLayerHeight: number;     // mm
  // speeds (mm/s)
  printSpeed: number;
  firstLayerSpeed: number;
  travelSpeed: number;
  infillSpeed: number;
  perimeterSpeed: number;
  // temperatures (°C)
  nozzleTemperature: number;
  bedTemperature: number;
  // retraction
  retractionDistance: number;   // mm
  retractionSpeed: number;      // mm/s
  // flow
  flowRate: number;             // multiplier, 1.0 = 100%
  // infill
  infillDensity: number;        // 0–1
  infillPattern: string;
  // walls & surfaces
  wallCount: number;
  topLayers: number;
  bottomLayers: number;
  // supports
  supportEnabled: boolean;
  supportDensity: number;       // 0–1
  // adhesion
  brimEnabled: boolean;
  brimWidth: number;            // mm
  skirtLoops: number;
}

/** Partial overrides for per-plate or per-part settings. */
export type ProfileOverrides = Partial<PrintProfile>;

/** Default profile with sensible values for a 0.4mm nozzle. */
export const DEFAULT_PROFILE: PrintProfile = {
  name: "Default",
  version: "1.0.0",
  nozzleDiameter: 0.4,
  filamentDiameter: 1.75,
  layerHeight: 0.2,
  firstLayerHeight: 0.24,
  printSpeed: 50,
  firstLayerSpeed: 25,
  travelSpeed: 150,
  infillSpeed: 80,
  perimeterSpeed: 40,
  nozzleTemperature: 210,
  bedTemperature: 60,
  retractionDistance: 5,
  retractionSpeed: 45,
  flowRate: 1.0,
  infillDensity: 0.2,
  infillPattern: "gyroid",
  wallCount: 3,
  topLayers: 4,
  bottomLayers: 4,
  supportEnabled: false,
  supportDensity: 0.15,
  brimEnabled: false,
  brimWidth: 5,
  skirtLoops: 1,
};
