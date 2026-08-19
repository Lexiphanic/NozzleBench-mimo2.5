import type { PrintProfile, ProfileOverrides } from "./types";

/**
 * Resolve final print parameters by layering overrides onto a base profile.
 *
 * Priority (highest wins):
 *   partOverrides → plateOverrides → base profile
 *
 * Only keys present in the override are applied; everything else inherits.
 */
export function resolveParameters(
  base: PrintProfile,
  plateOverrides: ProfileOverrides = {},
  partOverrides: ProfileOverrides = {},
): PrintProfile {
  return {
    ...base,
    ...plateOverrides,
    ...partOverrides,
  };
}
