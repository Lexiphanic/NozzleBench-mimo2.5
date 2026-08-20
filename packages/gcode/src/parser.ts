import type { GCodeCommand } from "./types";

/**
 * Parse a single G-code line into a structured command.
 * Handles: G0/G1 (linear move), G28 (home), G92 (set position),
 * M82/M83 (extruder mode), M104/M109 (temperature), M140/M190 (bed temp),
 * M106/M107 (fan), and comments.
 */
export function parseLine(text: string, lineIndex: number): GCodeCommand {
  const trimmed = text.trim();
  const params: Record<string, number> = {};

  // Split comment from command
  let commandPart = trimmed;
  let comment: string | undefined;
  const semicolonIdx = trimmed.indexOf(";");
  if (semicolonIdx >= 0) {
    comment = trimmed.slice(semicolonIdx + 1).trim();
    commandPart = trimmed.slice(0, semicolonIdx).trim();
  }

  // Extract command number (G0, G1, M82, etc.)
  let command: number | undefined;
  const cmdMatch = commandPart.match(/^([GM])(\d+)/i);
  if (cmdMatch) {
    command = parseInt(cmdMatch[2], 10);
  }

  // Extract parameters (X1.234, Y5.678, E0.05, F1200, etc.)
  const paramRegex = /([A-Z])(-?[\d.]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = paramRegex.exec(commandPart)) !== null) {
    params[match[1].toUpperCase()] = parseFloat(match[2]);
  }

  return {
    line: lineIndex,
    raw: text,
    command,
    params,
    comment,
  };
}

/**
 * Parse G-code text into an array of commands.
 * Skips empty lines and lines that are only comments.
 */
export function parseGCode(source: string): GCodeCommand[] {
  const lines = source.split("\n");
  const commands: GCodeCommand[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith(";")) {
      // Keep comments as commands for metadata extraction
      if (trimmed.startsWith(";")) {
        commands.push(parseLine(line, i));
      }
      continue;
    }
    commands.push(parseLine(line, i));
  }

  return commands;
}

/**
 * Classify a G-code command comment into a FeatureType.
 * Slicers embed feature type in comments like:
 *   ; TYPE:WALL-OUTER
 *   ; TYPE:INFILL
 *   ; feature: support
 * Also handles PrusaSlicer/OrcaSlicer comment patterns.
 */
export function classifyFeatureType(
  command: GCodeCommand,
): string | undefined {
  const comment = command.comment;
  if (!comment) return undefined;

  // OrcaSlicer/PrusaSlicer format: ; TYPE:FeatureName
  const typeMatch = comment.match(/TYPE:([A-Z_-]+)/i);
  if (typeMatch) {
    return normalizeFeatureType(typeMatch[1]);
  }

  // Alternative format: ; feature: name
  const featureMatch = comment.match(/feature:\s*(\S+)/i);
  if (featureMatch) {
    return normalizeFeatureType(featureMatch[1]);
  }

  return undefined;
}

/**
 * Normalize a feature type string from various slicer comment formats
 * into our canonical FeatureType.
 */
function normalizeFeatureType(raw: string): string {
  const lower = raw.toLowerCase().replace(/[_\s]+/g, "-");

  const aliases: Record<string, string> = {
    "outer-wall": "wall-outer",
    "perimeter": "wall-outer",
    "external-perimeter": "wall-outer",
    "inner-wall": "wall-inner",
    "wall": "wall-inner",
    "internal-perimeter": "wall-inner",
    "solid-infill": "top-surface",
    "top-solid-infill": "top-surface",
    "bottom-solid-infill": "bottom-surface",
    "bridge-infill": "bridge",
    "support-material": "support",
    "support-material-interface": "support-interface",
    overhang: "support",
  };

  return aliases[lower] ?? lower;
}
