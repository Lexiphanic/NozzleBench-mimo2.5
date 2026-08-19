import { describe, it, expect, beforeEach } from "bun:test";
import {
  InfillPatternRegistry,
  registry,
  InfillOrder,
  DEFAULT_INFILL_CONFIG,
} from "@NozzleBench/plugin-sdk";
import type { InfillPattern } from "@NozzleBench/plugin-sdk";

describe("InfillPatternRegistry", () => {
  let reg: InfillPatternRegistry;

  beforeEach(() => {
    reg = new InfillPatternRegistry();
  });

  const makePattern = (id: string): InfillPattern => ({
    id,
    name: id.toUpperCase(),
    version: 1,
    defaultParams: {},
    density: () => 0.5,
  });

  it("starts empty", () => {
    expect(reg.size).toBe(0);
    expect(reg.list()).toEqual([]);
    expect(reg.all()).toEqual([]);
  });

  it("registers and retrieves a pattern", () => {
    const p = makePattern("test");
    reg.register(p);
    expect(reg.has("test")).toBe(true);
    expect(reg.get("test")).toBe(p);
    expect(reg.size).toBe(1);
  });

  it("lists registered pattern ids", () => {
    reg.register(makePattern("a"));
    reg.register(makePattern("b"));
    expect(reg.list()).toEqual(["a", "b"]);
  });

  it("throws on duplicate registration", () => {
    reg.register(makePattern("dup"));
    expect(() => reg.register(makePattern("dup"))).toThrow(
      'Infill pattern "dup" is already registered',
    );
  });

  it("unregisters a pattern", () => {
    reg.register(makePattern("removable"));
    expect(reg.unregister("removable")).toBe(true);
    expect(reg.has("removable")).toBe(false);
    expect(reg.size).toBe(0);
  });

  it("returns false when unregistering a nonexistent pattern", () => {
    expect(reg.unregister("ghost")).toBe(false);
  });

  it("clears all patterns", () => {
    reg.register(makePattern("a"));
    reg.register(makePattern("b"));
    reg.clear();
    expect(reg.size).toBe(0);
    expect(reg.list()).toEqual([]);
  });

  it("returns all patterns via all()", () => {
    const a = makePattern("a");
    const b = makePattern("b");
    reg.register(a);
    reg.register(b);
    expect(reg.all()).toEqual([a, b]);
  });

  it("returns undefined for unknown pattern", () => {
    expect(reg.get("nonexistent")).toBeUndefined();
  });
});

describe("Global registry", () => {
  it("is an InfillPatternRegistry instance", () => {
    expect(registry).toBeInstanceOf(InfillPatternRegistry);
  });
});

describe("DEFAULT_INFILL_CONFIG", () => {
  it("has sensible defaults", () => {
    expect(DEFAULT_INFILL_CONFIG.density).toBe(20);
    expect(DEFAULT_INFILL_CONFIG.angle).toBe(45);
    expect(DEFAULT_INFILL_CONFIG.order).toBe(InfillOrder.InnerFirst);
    expect(DEFAULT_INFILL_CONFIG.overlap).toBe(0.15);
    expect(DEFAULT_INFILL_CONFIG.solidTopLayers).toBe(3);
    expect(DEFAULT_INFILL_CONFIG.solidBottomLayers).toBe(3);
    expect(DEFAULT_INFILL_CONFIG.layerHeight).toBe(0.2);
  });

  it("has empty pattern params", () => {
    expect(Object.keys(DEFAULT_INFILL_CONFIG.patternParams)).toHaveLength(0);
  });
});

describe("InfillOrder enum", () => {
  it("has inner-first and outer-first values", () => {
    expect(InfillOrder.InnerFirst).toBe("inner-first");
    expect(InfillOrder.OuterFirst).toBe("outer-first");
  });
});
