import { describe, expect, test } from "bun:test";
import {
  generateToolChange,
  generatePlateToolChanges,
  serializeToolChangeCommands,
  generatePlateToolChangeGCode,
} from "../src/tool-change";
import type { BuildPlate, PurgeConfig, PlatePart, MeshPart } from "@nozzle-bench/engine";

const meshA: MeshPart = { id: "m1", name: "Cube" };
const meshB: MeshPart = { id: "m2", name: "Sphere" };

const noPurge: PurgeConfig = {
  enabled: false,
  towerPosition: { x: 0, y: 0 },
  towerSize: { width: 10, height: 10 },
  purgeLength: 30,
};

const withPurge: PurgeConfig = {
  enabled: true,
  towerPosition: { x: 50, y: 50 },
  towerSize: { width: 15, height: 15 },
  purgeLength: 40,
};

function makePart(id: string, mesh: MeshPart, extruderIndex: number): PlatePart {
  return { partId: id, meshPart: mesh, profileOverrides: {}, extruderIndex };
}

function makePlate(id: string, parts: PlatePart[]): BuildPlate {
  return { id, name: `Plate ${id}`, profileOverrides: {}, parts };
}

describe("generateToolChange", () => {
  test("returns empty array when same extruder", () => {
    const result = generateToolChange(0, 0, noPurge);
    expect(result).toEqual([]);
  });

  test("generates retract → T-code → unretract without purge", () => {
    const result = generateToolChange(0, 1, noPurge);
    expect(result).toHaveLength(3); // retract, tool-select, unretract
    expect(result[0].type).toBe("retract");
    expect(result[0].e).toBe(-5);
    expect(result[1].type).toBe("tool-select");
    expect(result[1].extruderIndex).toBe(1);
    expect(result[2].type).toBe("unretract");
    expect(result[2].e).toBe(5);
  });

  test("generates retract → T-code → purge → unretract with purge enabled", () => {
    const result = generateToolChange(0, 2, withPurge);
    expect(result).toHaveLength(4); // retract, tool-select, purge, unretract
    expect(result[0].type).toBe("retract");
    expect(result[1].type).toBe("tool-select");
    expect(result[1].extruderIndex).toBe(2);
    expect(result[2].type).toBe("purge");
    expect(result[2].e).toBe(40);
    expect(result[3].type).toBe("unretract");
  });

  test("T-code matches target extruder index", () => {
    const result = generateToolChange(1, 3, noPurge);
    const toolSelect = result.find((c) => c.type === "tool-select");
    expect(toolSelect?.extruderIndex).toBe(3);
  });
});

describe("serializeToolChangeCommands", () => {
  test("emits T-code line for tool-select", () => {
    const lines = serializeToolChangeCommands([
      { type: "tool-select", extruderIndex: 1 },
    ]);
    expect(lines).toEqual(["T1"]);
  });

  test("emits G1 with E and F for retract", () => {
    const lines = serializeToolChangeCommands([
      { type: "retract", e: -5, f: 2700 },
    ]);
    expect(lines[0]).toMatch(/^G1 E-5\.000 F2700$/);
  });

  test("emits G1 with E for purge", () => {
    const lines = serializeToolChangeCommands([
      { type: "purge", e: 30, f: 300 },
    ]);
    expect(lines[0]).toMatch(/^G1 E30\.000 F300$/);
  });

  test("emits comments when present", () => {
    const lines = serializeToolChangeCommands([
      { type: "tool-select", extruderIndex: 0, comment: "; Select T0" },
    ]);
    expect(lines).toEqual(["; Select T0", "T0"]);
  });

  test("full sequence: retract, T1, purge, unretract", () => {
    const commands = generateToolChange(0, 1, withPurge);
    const lines = serializeToolChangeCommands(commands);
    // Should contain T1
    expect(lines).toContain("T1");
    // Should contain a retract G1 (negative E)
    expect(lines.some((l) => l.startsWith("G1") && l.includes("E-5"))).toBe(true);
    // Should contain an unretract G1 (positive E)
    expect(lines.some((l) => l.startsWith("G1") && l.includes("E5"))).toBe(true);
  });
});

describe("generatePlateToolChanges", () => {
  test("single extruder: no tool changes", () => {
    const plate = makePlate("p1", [
      makePart("a", meshA, 0),
      makePart("b", meshB, 0),
    ]);
    const result = generatePlateToolChanges(plate, noPurge);
    expect(result.plateId).toBe("p1");
    // Only move commands for parts, no tool-select
    expect(result.commands.every((c) => c.type !== "tool-select")).toBe(true);
  });

  test("two extruders: one tool change", () => {
    const plate = makePlate("p1", [
      makePart("a", meshA, 0),
      makePart("b", meshB, 1),
    ]);
    const result = generatePlateToolChanges(plate, noPurge);
    const toolSelects = result.commands.filter((c) => c.type === "tool-select");
    expect(toolSelects).toHaveLength(1);
    expect(toolSelects[0].extruderIndex).toBe(1);
  });

  test("three extruders: two tool changes", () => {
    const plate = makePlate("p1", [
      makePart("a", meshA, 0),
      makePart("b", meshB, 2),
      makePart("c", meshA, 1),
    ]);
    const result = generatePlateToolChanges(plate, noPurge);
    const toolSelects = result.commands.filter((c) => c.type === "tool-select");
    expect(toolSelects).toHaveLength(2);
    expect(toolSelects[0].extruderIndex).toBe(1);
    expect(toolSelects[1].extruderIndex).toBe(2);
  });

  test("tool changes include purge when enabled", () => {
    const plate = makePlate("p1", [
      makePart("a", meshA, 0),
      makePart("b", meshB, 1),
    ]);
    const result = generatePlateToolChanges(plate, withPurge);
    const purges = result.commands.filter((c) => c.type === "purge");
    expect(purges).toHaveLength(1);
  });

  test("move commands reference each part", () => {
    const plate = makePlate("p1", [
      makePart("a", meshA, 0),
      makePart("b", meshB, 1),
    ]);
    const result = generatePlateToolChanges(plate, noPurge);
    const moves = result.commands.filter((c) => c.type === "move");
    expect(moves).toHaveLength(2);
    expect(moves[0].comment).toContain("Cube");
    expect(moves[1].comment).toContain("Sphere");
  });
});

describe("generatePlateToolChangeGCode", () => {
  test("produces valid G-code string with tool changes", () => {
    const plate = makePlate("p1", [
      makePart("a", meshA, 0),
      makePart("b", meshB, 1),
    ]);
    const gcode = generatePlateToolChangeGCode(plate, noPurge);
    expect(gcode).toContain("T1");
    expect(gcode.split("\n").length).toBeGreaterThan(3);
  });

  test("no tool-change G-code for single extruder", () => {
    const plate = makePlate("p1", [
      makePart("a", meshA, 0),
      makePart("b", meshB, 0),
    ]);
    const gcode = generatePlateToolChangeGCode(plate, noPurge);
    // No standalone T-code lines (comments mentioning T0 are fine)
    const lines = gcode.split("\n");
    expect(lines.every((l) => l.trim() !== "T0")).toBe(true);
    expect(lines.every((l) => l.trim() !== "T1")).toBe(true);
  });

  test("G-code with purge includes purge G1 commands", () => {
    const plate = makePlate("p1", [
      makePart("a", meshA, 0),
      makePart("b", meshB, 1),
    ]);
    const gcode = generatePlateToolChangeGCode(plate, withPurge);
    expect(gcode).toContain("T1");
    // Purge line should be present (G1 with positive E)
    const lines = gcode.split("\n");
    expect(lines.some((l) => l.startsWith("G1") && l.includes("E40"))).toBe(true);
  });
});
