import type {
  BuildPlate,
  PurgeConfig,
  ToolChangeCommand,
  PlateToolChangeSequence,
  PlatePart,
} from "@nozzle-bench/engine";
import { partsByExtruder } from "@nozzle-bench/engine";

const DEFAULT_PURGE: PurgeConfig = {
  enabled: false,
  towerPosition: { x: 0, y: 0 },
  towerSize: { width: 10, height: 10 },
  purgeLength: 30,
};

/**
 * Generate the tool-change sequence for a single extruder switch.
 *
 * Produces: retract → T-code → purge (if configured) → unretract.
 */
export function generateToolChange(
  fromExtruder: number,
  toExtruder: number,
  purge: PurgeConfig = DEFAULT_PURGE,
): ToolChangeCommand[] {
  if (fromExtruder === toExtruder) return [];

  const commands: ToolChangeCommand[] = [];

  // Retract filament before tool change
  commands.push({
    type: "retract",
    e: -5,
    f: 45 * 60, // mm/min
    comment: `; Retract before tool change T${fromExtruder} -> T${toExtruder}`,
  });

  // Select new extruder
  commands.push({
    type: "tool-select",
    extruderIndex: toExtruder,
    comment: `; Tool change: T${toExtruder}`,
  });

  // Purge filament if enabled
  if (purge.enabled) {
    commands.push({
      type: "purge",
      extruderIndex: toExtruder,
      e: purge.purgeLength,
      f: 5 * 60, // slow purge speed
      comment: `; Purge after T${toExtruder} select`,
    });
  }

  // Unretract
  commands.push({
    type: "unretract",
    e: 5,
    f: 45 * 60,
    comment: `; Unretract after tool change`,
  });

  return commands;
}

/**
 * Generate tool-change G-code for an entire plate.
 *
 * Groups parts by extruder (sorted ascending by index), and emits tool-change
 * sequences between groups. The first group gets an initial tool select.
 */
export function generatePlateToolChanges(
  plate: BuildPlate,
  purge: PurgeConfig = DEFAULT_PURGE,
): PlateToolChangeSequence {
  const groups = partsByExtruder(plate);
  const commands: ToolChangeCommand[] = [];
  let currentExtruder = -1; // no extruder selected yet

  for (const [extruderIndex, _parts] of groups) {
    if (currentExtruder === -1) {
      // First extruder group: emit initial T-code if not T0
      if (extruderIndex !== 0) {
        commands.push({
          type: "tool-select",
          extruderIndex,
          comment: `; Initial tool select T${extruderIndex}`,
        });
      }
    } else {
      commands.push(...generateToolChange(currentExtruder, extruderIndex, purge));
    }
    currentExtruder = extruderIndex;

    // Add part-processing marker for each part in this extruder group
    for (const part of _parts) {
      commands.push({
        type: "move",
        comment: `; Processing part "${part.meshPart.name}" on T${extruderIndex}`,
      });
    }
  }

  return { plateId: plate.id, commands };
}

/**
 * Serialize tool-change commands into G-code lines.
 */
export function serializeToolChangeCommands(
  commands: ToolChangeCommand[],
): string[] {
  const lines: string[] = [];

  for (const cmd of commands) {
    if (cmd.comment) lines.push(cmd.comment);

    switch (cmd.type) {
      case "tool-select":
        lines.push(`T${cmd.extruderIndex}`);
        break;
      case "retract":
      case "unretract": {
        const e = cmd.e != null ? ` E${cmd.e.toFixed(3)}` : "";
        const f = cmd.f != null ? ` F${cmd.f}` : "";
        lines.push(`G1${e}${f}`);
        break;
      }
      case "purge": {
        const e = cmd.e != null ? ` E${cmd.e.toFixed(3)}` : "";
        const f = cmd.f != null ? ` F${cmd.f}` : "";
        lines.push(`G1${e}${f}`);
        break;
      }
      case "move": {
        const parts: string[] = ["G1"];
        if (cmd.x != null) parts.push(` X${cmd.x.toFixed(3)}`);
        if (cmd.y != null) parts.push(` Y${cmd.y.toFixed(3)}`);
        if (cmd.z != null) parts.push(` Z${cmd.z.toFixed(3)}`);
        if (cmd.e != null) parts.push(` E${cmd.e.toFixed(3)}`);
        if (cmd.f != null) parts.push(` F${cmd.f}`);
        lines.push(parts.join(""));
        break;
      }
    }
  }

  return lines;
}

/**
 * Generate complete tool-change G-code for a plate as a string.
 */
export function generatePlateToolChangeGCode(
  plate: BuildPlate,
  purge: PurgeConfig = DEFAULT_PURGE,
): string {
  const sequence = generatePlateToolChanges(plate, purge);
  return serializeToolChangeCommands(sequence.commands).join("\n");
}
