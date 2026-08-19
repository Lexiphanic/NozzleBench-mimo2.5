import { describe, expect, test } from "bun:test";
import { resolveParameters, DEFAULT_PROFILE, type PrintProfile } from "../src/index";

describe("resolveParameters", () => {
  const base: PrintProfile = {
    ...DEFAULT_PROFILE,
    name: "Base",
    layerHeight: 0.2,
    printSpeed: 50,
    nozzleTemperature: 210,
    infillDensity: 0.2,
  };

  test("returns base when no overrides provided", () => {
    const result = resolveParameters(base);
    expect(result.layerHeight).toBe(0.2);
    expect(result.printSpeed).toBe(50);
    expect(result.nozzleTemperature).toBe(210);
  });

  test("plate overrides take priority over base", () => {
    const result = resolveParameters(base, { layerHeight: 0.12, printSpeed: 30 });
    expect(result.layerHeight).toBe(0.12);
    expect(result.printSpeed).toBe(30);
    expect(result.nozzleTemperature).toBe(210); // unchanged
  });

  test("part overrides take priority over plate overrides", () => {
    const result = resolveParameters(
      base,
      { layerHeight: 0.12, printSpeed: 30 },
      { layerHeight: 0.08 },
    );
    expect(result.layerHeight).toBe(0.08); // part wins
    expect(result.printSpeed).toBe(30);    // from plate
    expect(result.nozzleTemperature).toBe(210); // from base
  });

  test("part overrides take priority over base (no plate overrides)", () => {
    const result = resolveParameters(base, {}, { nozzleTemperature: 230 });
    expect(result.nozzleTemperature).toBe(230);
    expect(result.layerHeight).toBe(0.2);
  });

  test("empty overrides produce identical profile", () => {
    const result = resolveParameters(base, {}, {});
    expect(result).toEqual(base);
  });

  test("overrides do not mutate the base profile", () => {
    const original = { ...base };
    resolveParameters(base, { layerHeight: 999 }, { printSpeed: 999 });
    expect(base).toEqual(original);
  });

  test("all fields can be overridden independently", () => {
    const result = resolveParameters(base, { infillDensity: 0.5 }, { wallCount: 6 });
    expect(result.infillDensity).toBe(0.5);
    expect(result.wallCount).toBe(6);
    expect(result.layerHeight).toBe(0.2); // unchanged
  });
});
