import { describe, it, expect } from "bun:test";
import { degToRad, rotatePoint, applyDensity, layerAngle } from "@NozzleBench/engine/infill";
import { GridPattern, GyroidPattern } from "@NozzleBench/engine/infill";
import { generateInfillLines } from "@NozzleBench/engine/infill";
import type { InfillConfig } from "@NozzleBench/plugin-sdk";
import { InfillOrder, DEFAULT_INFILL_CONFIG } from "@NozzleBench/plugin-sdk";

describe("degToRad", () => {
  it("converts 0 degrees", () => {
    expect(degToRad(0)).toBe(0);
  });

  it("converts 90 degrees", () => {
    expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
  });

  it("converts 180 degrees", () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI);
  });

  it("converts 45 degrees", () => {
    expect(degToRad(45)).toBeCloseTo(Math.PI / 4);
  });
});

describe("rotatePoint", () => {
  it("identity rotation (0 radians)", () => {
    const [x, y] = rotatePoint(1, 2, 0);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(2);
  });

  it("90-degree rotation", () => {
    const [x, y] = rotatePoint(1, 0, Math.PI / 2);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(1);
  });

  it("180-degree rotation", () => {
    const [x, y] = rotatePoint(1, 0, Math.PI);
    expect(x).toBeCloseTo(-1);
    expect(y).toBeCloseTo(0);
  });

  it("preserves distance from origin", () => {
    const angle = 0.7;
    const [x, y] = rotatePoint(3, 4, angle);
    const dist = Math.sqrt(x * x + y * y);
    expect(dist).toBeCloseTo(5);
  });
});

describe("applyDensity", () => {
  it("returns 0 for density 0", () => {
    expect(applyDensity(1, 0)).toBe(0);
  });

  it("returns 1 for density 100", () => {
    expect(applyDensity(0, 100)).toBe(1);
    expect(applyDensity(1, 100)).toBe(1);
  });

  it("returns 1 when raw >= threshold", () => {
    // density 50 → threshold = 0.5; raw 0.6 ≥ 0.5 → 1
    expect(applyDensity(0.6, 50)).toBe(1);
  });

  it("returns 0 when raw < threshold", () => {
    // density 50 → threshold = 0.5; raw 0.3 < 0.5 → 0
    expect(applyDensity(0.3, 50)).toBe(0);
  });

  it("handles boundary density", () => {
    // density 10 → threshold 0.9; raw 0.9 exactly → 1
    expect(applyDensity(0.9, 10)).toBe(1);
    expect(applyDensity(0.89, 10)).toBe(0);
  });
});

describe("layerAngle", () => {
  it("returns fixed angle when no angleFn", () => {
    expect(layerAngle(0, 45)).toBe(45);
    expect(layerAngle(10, 45)).toBe(45);
  });

  it("uses angleFn when provided", () => {
    const fn = (i: number) => i * 45;
    expect(layerAngle(0, 45, fn)).toBe(0);
    expect(layerAngle(1, 45, fn)).toBe(45);
    expect(layerAngle(2, 45, fn)).toBe(90);
  });
});

describe("generateInfillLines", () => {
  const bounds = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
  const totalLayers = 50;

  it("returns solid lines for bottom solid layers", () => {
    const config: InfillConfig = {
      ...DEFAULT_INFILL_CONFIG,
      solidBottomLayers: 3,
      solidTopLayers: 3,
    };
    const result = generateInfillLines(bounds, GridPattern, config, 0, totalLayers);
    expect(result.solid).toBe(true);
    expect(result.lines.length).toBeGreaterThan(0);
  });

  it("returns solid lines for top solid layers", () => {
    const config: InfillConfig = {
      ...DEFAULT_INFILL_CONFIG,
      solidBottomLayers: 3,
      solidTopLayers: 3,
    };
    const result = generateInfillLines(bounds, GridPattern, config, 48, totalLayers);
    expect(result.solid).toBe(true);
  });

  it("returns sparse infill for middle layers", () => {
    const config: InfillConfig = {
      ...DEFAULT_INFILL_CONFIG,
      density: 20,
      solidBottomLayers: 3,
      solidTopLayers: 3,
    };
    const result = generateInfillLines(bounds, GridPattern, config, 20, totalLayers);
    expect(result.solid).toBe(false);
    expect(result.lines.length).toBeGreaterThan(0);
  });

  it("returns empty for density 0", () => {
    const config: InfillConfig = {
      ...DEFAULT_INFILL_CONFIG,
      density: 0,
    };
    const result = generateInfillLines(bounds, GridPattern, config, 20, totalLayers);
    expect(result.solid).toBe(false);
    expect(result.lines).toHaveLength(0);
  });

  it("respects per-layer angle function", () => {
    const config: InfillConfig = {
      ...DEFAULT_INFILL_CONFIG,
      density: 20,
      angleFn: (i) => (i % 2 === 0 ? 0 : 90),
    };
    // Should not throw and produce lines
    const result = generateInfillLines(bounds, GridPattern, config, 10, totalLayers);
    expect(result.lines.length).toBeGreaterThan(0);
  });

  it("works with different patterns", () => {
    const config: InfillConfig = {
      ...DEFAULT_INFILL_CONFIG,
      density: 30,
    };
    const gridResult = generateInfillLines(bounds, GridPattern, config, 10, totalLayers);
    const gyroidResult = generateInfillLines(bounds, GyroidPattern, config, 10, totalLayers);
    // Both should produce lines (different patterns, same density)
    expect(gridResult.lines.length).toBeGreaterThan(0);
    expect(gyroidResult.lines.length).toBeGreaterThan(0);
    // They may differ in count (different patterns)
    expect(gridResult.lines.length).not.toBe(gyroidResult.lines.length);
  });

  it("overlap extends line endpoints", () => {
    const configNoOverlap: InfillConfig = {
      ...DEFAULT_INFILL_CONFIG,
      density: 100,
      overlap: 0,
      solidBottomLayers: 0,
      solidTopLayers: 0,
    };
    const configWithOverlap: InfillConfig = {
      ...DEFAULT_INFILL_CONFIG,
      density: 100,
      overlap: 1.0,
      solidBottomLayers: 0,
      solidTopLayers: 0,
    };
    const noOverlap = generateInfillLines(bounds, GridPattern, configNoOverlap, 10, totalLayers);
    const withOverlap = generateInfillLines(bounds, GridPattern, configWithOverlap, 10, totalLayers);
    // With overlap, lines should extend beyond bounds
    const minXNoOverlap = Math.min(...noOverlap.lines.flatMap((l) => [l.x1, l.x2]));
    const minXWithOverlap = Math.min(...withOverlap.lines.flatMap((l) => [l.x1, l.x2]));
    expect(minXWithOverlap).toBeLessThan(minXNoOverlap);
  });

  it("solid bottom layers = 0 skips bottom solid", () => {
    const config: InfillConfig = {
      ...DEFAULT_INFILL_CONFIG,
      solidBottomLayers: 0,
      solidTopLayers: 0,
    };
    const result = generateInfillLines(bounds, GridPattern, config, 0, totalLayers);
    expect(result.solid).toBe(false);
  });

  it("records correct layer index", () => {
    const config: InfillConfig = {
      ...DEFAULT_INFILL_CONFIG,
      solidBottomLayers: 0,
      solidTopLayers: 0,
    };
    const result = generateInfillLines(bounds, GridPattern, config, 42, totalLayers);
    expect(result.layerIndex).toBe(42);
  });
});
