import type { PrintProfile, ProfileOverrides } from "@nozzle-bench/profiles";

/** A mesh part loaded into a plate. */
export interface MeshPart {
  id: string;
  name: string;
  meshPath?: string;
}

/** A part placed on a plate, with per-part overrides and extruder assignment. */
export interface PlatePart {
  partId: string;
  meshPart: MeshPart;
  profileOverrides: ProfileOverrides;
  extruderIndex: number;
}

/** A single build plate within a project. */
export interface BuildPlate {
  id: string;
  name: string;
  profileOverrides: ProfileOverrides;
  parts: PlatePart[];
}

/** Entry in the plate queue — orders plates for batch printing. */
export interface PlateQueueItem {
  plateId: string;
  sequence: number;
}

/** A multi-plate project with global profile, plates, and a queue. */
export interface MultiPlateProject {
  id: string;
  name: string;
  globalProfile: PrintProfile;
  plates: BuildPlate[];
  queue: PlateQueueItem[];
}

/** Configuration for the purge/wipe tower used during tool changes. */
export interface PurgeConfig {
  enabled: boolean;
  towerPosition: { x: number; y: number };
  towerSize: { width: number; height: number };
  purgeLength: number; // mm of filament to retract for purge
}

/** A single command in a tool-change sequence. */
export interface ToolChangeCommand {
  type: "tool-select" | "purge" | "retract" | "unretract" | "move";
  extruderIndex?: number;
  x?: number;
  y?: number;
  z?: number;
  e?: number;
  f?: number;
  comment?: string;
}

/** Result of tool-change G-code generation for one plate. */
export interface PlateToolChangeSequence {
  plateId: string;
  commands: ToolChangeCommand[];
}
