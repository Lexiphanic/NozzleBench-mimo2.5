import type { PrintProfile, ProfileOverrides } from "@nozzle-bench/profiles";
import type { PlatePart, BuildPlate } from "./types";

/**
 * Resolve the final print parameters for a part.
 *
 * Priority: part overrides → plate overrides → global profile.
 */
export function resolvePartParameters(
  globalProfile: PrintProfile,
  plate: BuildPlate,
  part: PlatePart,
): PrintProfile {
  return {
    ...globalProfile,
    ...plate.profileOverrides,
    ...part.profileOverrides,
  };
}

/**
 * Resolve parameters for every part on a plate.
 */
export function resolvePlateParameters(
  globalProfile: PrintProfile,
  plate: BuildPlate,
): Map<string, PrintProfile> {
  const result = new Map<string, PrintProfile>();
  for (const part of plate.parts) {
    result.set(part.partId, resolvePartParameters(globalProfile, plate, part));
  }
  return result;
}

/**
 * Collect the set of unique extruder indices used across all parts in a plate.
 */
export function plateExtruders(plate: BuildPlate): number[] {
  const set = new Set(plate.parts.map((p) => p.extruderIndex));
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * Group parts by their extruder index, sorted ascending.
 * Returns [extruderIndex, parts[]] pairs.
 */
export function partsByExtruder(
  plate: BuildPlate,
): [number, PlatePart[]][] {
  const map = new Map<number, PlatePart[]>();
  for (const part of plate.parts) {
    const list = map.get(part.extruderIndex) ?? [];
    list.push(part);
    map.set(part.extruderIndex, list);
  }
  return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
}
