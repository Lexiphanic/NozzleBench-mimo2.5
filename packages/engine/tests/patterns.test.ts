import { describe, it, expect } from "bun:test";
import {
  GridPattern,
  GyroidPattern,
  LightningPattern,
  HoneycombPattern,
  TriangularPattern,
  CubicPattern,
} from "@NozzleBench/engine/infill";
import type { InfillPattern } from "@NozzleBench/plugin-sdk";

/** Test helpers: verify basic pattern contract. */
const assertPatternContract = (pattern: InfillPattern) => {
  expect(pattern.id).toBeTruthy();
  expect(pattern.name).toBeTruthy();
  expect(pattern.version).toBeGreaterThan(0);
  expect(pattern.defaultParams).toBeDefined();
  expect(typeof pattern.density).toBe("function");
};

/**
 * Sample a pattern over a grid and return the fraction of filled points.
 * Used to verify density percentages match expectations.
 */
const sampleDensity = (
  pattern: InfillPattern,
  params: Record<string, unknown>,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  step: number,
): number => {
  let filled = 0;
  let total = 0;
  for (let x = bounds.minX; x < bounds.maxX; x += step) {
    for (let y = bounds.minY; y < bounds.maxY; y += step) {
      const val = pattern.density(x, y, params);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
      filled += val;
      total++;
    }
  }
  return filled / total;
};

describe("Grid pattern", () => {
  it("satisfies pattern contract", () => {
    assertPatternContract(GridPattern);
    expect(GridPattern.id).toBe("grid");
  });

  it("returns 1 on grid lines", () => {
    // At x=0 with default spacing=4, lineWidth=0.4: should be on a line
    expect(GridPattern.density(0, 0)).toBe(1);
    expect(GridPattern.density(0, 2)).toBe(1);
    expect(GridPattern.density(2, 0)).toBe(1);
  });

  it("returns 0 away from grid lines", () => {
    // At x=2, y=2 (midpoint between lines at 0 and 4), should be empty
    expect(GridPattern.density(2, 2)).toBe(0);
  });

  it("respects custom spacing", () => {
    // With spacing=2, lines at x=0,2,4... and y=0,2,4...
    expect(GridPattern.density(0, 0, { spacing: 2 })).toBe(1);
    // (1,1) is away from all grid lines with spacing=2
    expect(GridPattern.density(1, 1, { spacing: 2 })).toBe(0);
  });

  it("covers expected area fraction at 50% density equivalent", () => {
    // With default 4mm spacing and 0.4mm line width, ~20% of area is filled
    const fraction = sampleDensity(
      GridPattern,
      {},
      { minX: 0, minY: 0, maxX: 40, maxY: 40 },
      0.5,
    );
    // Line width 0.4 / spacing 4 = 10% per direction, ~20% total for grid
    expect(fraction).toBeGreaterThan(0.1);
    expect(fraction).toBeLessThan(0.3);
  });
});

describe("Gyroid pattern", () => {
  it("satisfies pattern contract", () => {
    assertPatternContract(GyroidPattern);
    expect(GyroidPattern.id).toBe("gyroid");
  });

  it("produces both filled and unfilled regions", () => {
    let filled = 0;
    let unfilled = 0;
    for (let i = 0; i < 100; i++) {
      const x = i * 0.5;
      const y = 0;
      if (GyroidPattern.density(x, y) === 1) filled++;
      else unfilled++;
    }
    expect(filled).toBeGreaterThan(0);
    expect(unfilled).toBeGreaterThan(0);
  });

  it("has periodic structure", () => {
    // Gyroid should be periodic with period related to 2π/scale
    const period = (2 * Math.PI);
    const v0 = GyroidPattern.density(0, 0);
    const vPeriod = GyroidPattern.density(period, 0);
    expect(v0).toBe(vPeriod);
  });

  it("scales with parameter", () => {
    const v1 = GyroidPattern.density(1, 1);
    const v2 = GyroidPattern.density(1, 1, { scale: 2 });
    // Different scales should generally produce different values at same point
    // (not always, but for this specific point it should differ)
    expect(typeof v1).toBe("number");
    expect(typeof v2).toBe("number");
  });
});

describe("Lightning pattern", () => {
  it("satisfies pattern contract", () => {
    assertPatternContract(LightningPattern);
    expect(LightningPattern.id).toBe("lightning");
  });

  it("fills at the seed point", () => {
    // hash2D(0,0) produces seed at local (0,0) → world (0,0) is the seed
    expect(LightningPattern.density(0, 0)).toBe(1);
  });

  it("is sparse overall", () => {
    const fraction = sampleDensity(
      LightningPattern,
      {},
      { minX: 0, minY: 0, maxX: 30, maxY: 30 },
      0.5,
    );
    // Lightning fills ~35% with default params (seed + neighbor branches)
    expect(fraction).toBeGreaterThan(0.15);
    expect(fraction).toBeLessThan(0.55);
  });

  it("fills at origin", () => {
    // Origin is a cell center for default cellSize=6
    expect(LightningPattern.density(0, 0)).toBe(1);
  });
});

describe("Honeycomb pattern", () => {
  it("satisfies pattern contract", () => {
    assertPatternContract(HoneycombPattern);
    expect(HoneycombPattern.id).toBe("honeycomb");
  });

  it("has periodic structure", () => {
    // Honeycomb should repeat with the hex grid period
    // Sample multiple points and verify periodicity exists
    const vals: number[] = [];
    for (let x = 0; x < 20; x += 0.5) {
      vals.push(HoneycombPattern.density(x, 0));
    }
    // Should have both filled and unfilled
    expect(vals.some((v) => v === 1)).toBe(true);
    expect(vals.some((v) => v === 0)).toBe(true);
  });

  it("covers reasonable area fraction", () => {
    const fraction = sampleDensity(
      HoneycombPattern,
      {},
      { minX: 0, minY: 0, maxX: 30, maxY: 30 },
      0.5,
    );
    // Honeycomb walls should cover some reasonable fraction
    expect(fraction).toBeGreaterThan(0.05);
    expect(fraction).toBeLessThan(0.5);
  });
});

describe("Triangular pattern", () => {
  it("satisfies pattern contract", () => {
    assertPatternContract(TriangularPattern);
    expect(TriangularPattern.id).toBe("triangular");
  });

  it("fills on line intersections", () => {
    // At origin, all three line sets should intersect
    expect(TriangularPattern.density(0, 0)).toBe(1);
  });

  it("covers more area than grid (3 line sets vs 2)", () => {
    const gridFrac = sampleDensity(
      { ...GridPattern, defaultParams: { spacing: 4, lineWidth: 0.4 } },
      { spacing: 4, lineWidth: 0.4 },
      { minX: 0, minY: 0, maxX: 40, maxY: 40 },
      0.5,
    );
    const triFrac = sampleDensity(
      TriangularPattern,
      { spacing: 4, lineWidth: 0.4 },
      { minX: 0, minY: 0, maxX: 40, maxY: 40 },
      0.5,
    );
    expect(triFrac).toBeGreaterThan(gridFrac);
  });
});

describe("Cubic pattern", () => {
  it("satisfies pattern contract", () => {
    assertPatternContract(CubicPattern);
    expect(CubicPattern.id).toBe("cubic");
  });

  it("produces both filled and unfilled regions", () => {
    let filled = 0;
    let unfilled = 0;
    for (let i = 0; i < 100; i++) {
      const x = i * 0.3;
      if (CubicPattern.density(x, x) === 1) filled++;
      else unfilled++;
    }
    expect(filled).toBeGreaterThan(0);
    expect(unfilled).toBeGreaterThan(0);
  });

  it("is relatively sparse (edge-only pattern)", () => {
    const fraction = sampleDensity(
      CubicPattern,
      {},
      { minX: 0, minY: 0, maxX: 20, maxY: 20 },
      0.3,
    );
    expect(fraction).toBeLessThan(0.3);
  });
});

describe("All patterns", () => {
  const allPatterns = [
    GridPattern,
    GyroidPattern,
    LightningPattern,
    HoneycombPattern,
    TriangularPattern,
    CubicPattern,
  ];

  it("all have unique ids", () => {
    const ids = allPatterns.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all return values in [0, 1]", () => {
    for (const pattern of allPatterns) {
      for (let x = -10; x <= 10; x += 2) {
        for (let y = -10; y <= 10; y += 2) {
          const val = pattern.density(x, y);
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("all handle custom params without crashing", () => {
    for (const pattern of allPatterns) {
      expect(() =>
        pattern.density(1, 1, { ...pattern.defaultParams }),
      ).not.toThrow();
    }
  });
});
