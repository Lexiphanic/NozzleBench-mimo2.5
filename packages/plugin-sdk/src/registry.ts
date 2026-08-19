/**
 * Infill pattern registry.
 *
 * A central registry for all infill patterns. Core patterns register at
 * startup; plugins can register additional patterns at runtime.
 *
 * @example
 * ```ts
 * import { registry } from "@NozzleBench/plugin-sdk";
 *
 * // Register a custom pattern
 * registry.register({
 *   id: "concentric",
 *   name: "Concentric",
 *   version: 1,
 *   defaultParams: { offset: 1.0 },
 *   density(x, y, params) {
 *     const offset = (params?.offset as number) ?? 1.0;
 *     const dist = Math.sqrt(x * x + y * y) / offset;
 *     return (dist % 1) < 0.5 ? 1 : 0;
 *   },
 * });
 * ```
 */

import type { InfillPattern } from "./types.js";

export class InfillPatternRegistry {
  private readonly patterns = new Map<string, InfillPattern>();

  /** Register a pattern. Throws if an id is already taken. */
  register(pattern: InfillPattern): void {
    if (this.patterns.has(pattern.id)) {
      throw new Error(
        `Infill pattern "${pattern.id}" is already registered.`,
      );
    }
    this.patterns.set(pattern.id, pattern);
  }

  /** Get a pattern by id, or undefined if not found. */
  get(id: string): InfillPattern | undefined {
    return this.patterns.get(id);
  }

  /** Check if a pattern with the given id exists. */
  has(id: string): boolean {
    return this.patterns.has(id);
  }

  /** Remove a pattern. Returns true if it was present. */
  unregister(id: string): boolean {
    return this.patterns.delete(id);
  }

  /** List all registered pattern ids. */
  list(): readonly string[] {
    return Array.from(this.patterns.keys());
  }

  /** List all registered patterns. */
  all(): readonly InfillPattern[] {
    return Array.from(this.patterns.values());
  }

  /** Number of registered patterns. */
  get size(): number {
    return this.patterns.size;
  }

  /** Remove all registered patterns. */
  clear(): void {
    this.patterns.clear();
  }
}

/** Global singleton registry. Plugins register here at import time. */
export const registry = new InfillPatternRegistry();
