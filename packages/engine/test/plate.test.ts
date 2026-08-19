import { describe, expect, test } from "bun:test";
import { DEFAULT_PROFILE } from "@nozzle-bench/profiles";
import {
  resolvePartParameters,
  resolvePlateParameters,
  plateExtruders,
  partsByExtruder,
  sortPlatesByQueue,
  setPlateQueue,
  createPlate,
  type MultiPlateProject,
  type BuildPlate,
  type PlatePart,
  type MeshPart,
} from "../src/index";

const meshA: MeshPart = { id: "m1", name: "Cube" };
const meshB: MeshPart = { id: "m2", name: "Sphere" };
const meshC: MeshPart = { id: "m3", name: "Cylinder" };

function makePart(id: string, mesh: MeshPart, extruderIndex: number, overrides = {}): PlatePart {
  return { partId: id, meshPart: mesh, profileOverrides: overrides, extruderIndex };
}

function makePlate(id: string, name: string, parts: PlatePart[], plateOverrides = {}): BuildPlate {
  return { id, name, profileOverrides: plateOverrides, parts };
}

function makeProject(plates: BuildPlate[], queue: { plateId: string; sequence: number }[] = []): MultiPlateProject {
  return { id: "proj1", name: "Test Project", globalProfile: { ...DEFAULT_PROFILE }, plates, queue };
}

describe("resolvePartParameters", () => {
  test("part inherits global when no overrides", () => {
    const plate = makePlate("p1", "Plate 1", []);
    const part = makePart("a", meshA, 0);
    const result = resolvePartParameters(DEFAULT_PROFILE, plate, part);
    expect(result.layerHeight).toBe(DEFAULT_PROFILE.layerHeight);
    expect(result.nozzleTemperature).toBe(DEFAULT_PROFILE.nozzleTemperature);
  });

  test("plate override applies over global", () => {
    const plate = makePlate("p1", "Plate 1", [], { layerHeight: 0.1 });
    const part = makePart("a", meshA, 0);
    const result = resolvePartParameters(DEFAULT_PROFILE, plate, part);
    expect(result.layerHeight).toBe(0.1);
  });

  test("part override applies over plate override", () => {
    const plate = makePlate("p1", "Plate 1", [], { layerHeight: 0.1 });
    const part = makePart("a", meshA, 0, { layerHeight: 0.05 });
    const result = resolvePartParameters(DEFAULT_PROFILE, plate, part);
    expect(result.layerHeight).toBe(0.05);
  });

  test("part override applies over global (no plate override)", () => {
    const plate = makePlate("p1", "Plate 1", []);
    const part = makePart("a", meshA, 0, { nozzleTemperature: 240 });
    const result = resolvePartParameters(DEFAULT_PROFILE, plate, part);
    expect(result.nozzleTemperature).toBe(240);
  });

  test("multiple fields overridden independently", () => {
    const plate = makePlate("p1", "Plate 1", [], { printSpeed: 30 });
    const part = makePart("a", meshA, 0, { infillDensity: 0.8 });
    const result = resolvePartParameters(DEFAULT_PROFILE, plate, part);
    expect(result.printSpeed).toBe(30);
    expect(result.infillDensity).toBe(0.8);
    expect(result.layerHeight).toBe(DEFAULT_PROFILE.layerHeight);
  });
});

describe("resolvePlateParameters", () => {
  test("returns a map of partId -> resolved parameters", () => {
    const plate = makePlate("p1", "Plate 1", [
      makePart("a", meshA, 0),
      makePart("b", meshB, 1, { layerHeight: 0.06 }),
    ]);
    const result = resolvePlateParameters(DEFAULT_PROFILE, plate);
    expect(result.size).toBe(2);
    expect(result.get("a")?.layerHeight).toBe(DEFAULT_PROFILE.layerHeight);
    expect(result.get("b")?.layerHeight).toBe(0.06);
  });
});

describe("plateExtruders", () => {
  test("collects unique extruder indices sorted", () => {
    const plate = makePlate("p1", "Plate 1", [
      makePart("a", meshA, 2),
      makePart("b", meshB, 0),
      makePart("c", meshC, 1),
      makePart("d", meshA, 2), // duplicate
    ]);
    expect(plateExtruders(plate)).toEqual([0, 1, 2]);
  });

  test("returns single extruder", () => {
    const plate = makePlate("p1", "Plate 1", [
      makePart("a", meshA, 0),
      makePart("b", meshB, 0),
    ]);
    expect(plateExtruders(plate)).toEqual([0]);
  });
});

describe("partsByExtruder", () => {
  test("groups parts by extruder index, sorted ascending", () => {
    const plate = makePlate("p1", "Plate 1", [
      makePart("a", meshA, 1),
      makePart("b", meshB, 0),
      makePart("c", meshC, 1),
    ]);
    const groups = partsByExtruder(plate);
    expect(groups).toHaveLength(2);
    expect(groups[0][0]).toBe(0); // T0
    expect(groups[0][1]).toHaveLength(1);
    expect(groups[1][0]).toBe(1); // T1
    expect(groups[1][1]).toHaveLength(2);
  });
});

describe("sortPlatesByQueue", () => {
  test("returns plates in queue order", () => {
    const p1 = makePlate("p1", "Plate 1", []);
    const p2 = makePlate("p2", "Plate 2", []);
    const p3 = makePlate("p3", "Plate 3", []);
    const project = makeProject([p1, p2, p3], [
      { plateId: "p3", sequence: 0 },
      { plateId: "p1", sequence: 1 },
      { plateId: "p2", sequence: 2 },
    ]);
    const result = sortPlatesByQueue(project);
    expect(result.map((p) => p.id)).toEqual(["p3", "p1", "p2"]);
  });

  test("unqueued plates appended at end", () => {
    const p1 = makePlate("p1", "Plate 1", []);
    const p2 = makePlate("p2", "Plate 2", []);
    const p3 = makePlate("p3", "Plate 3", []);
    const project = makeProject([p1, p2, p3], [
      { plateId: "p2", sequence: 0 },
    ]);
    const result = sortPlatesByQueue(project);
    expect(result.map((p) => p.id)).toEqual(["p2", "p1", "p3"]);
  });

  test("no queue returns original order", () => {
    const p1 = makePlate("p1", "Plate 1", []);
    const p2 = makePlate("p2", "Plate 2", []);
    const project = makeProject([p1, p2]);
    const result = sortPlatesByQueue(project);
    expect(result.map((p) => p.id)).toEqual(["p1", "p2"]);
  });
});

describe("setPlateQueue", () => {
  test("sets queue from plate ID list", () => {
    const p1 = makePlate("p1", "Plate 1", []);
    const p2 = makePlate("p2", "Plate 2", []);
    const project = makeProject([p1, p2]);
    const updated = setPlateQueue(project, ["p2", "p1"]);
    expect(updated.queue).toEqual([
      { plateId: "p2", sequence: 0 },
      { plateId: "p1", sequence: 1 },
    ]);
  });
});
