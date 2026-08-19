import type { MultiPlateProject, BuildPlate, PlateQueueItem } from "./types";

/**
 * Sort plates according to the project's queue.
 * Plates not in the queue are appended at the end in their original order.
 */
export function sortPlatesByQueue(project: MultiPlateProject): BuildPlate[] {
  const queueMap = new Map<string, number>();
  for (const item of project.queue) {
    queueMap.set(item.plateId, item.sequence);
  }

  const plateMap = new Map(project.plates.map((p) => [p.id, p]));
  const queued: BuildPlate[] = [];
  const unqueued: BuildPlate[] = [];

  // Collect queued plates
  for (const item of [...project.queue].sort((a, b) => a.sequence - b.sequence)) {
    const plate = plateMap.get(item.plateId);
    if (plate) queued.push(plate);
  }

  // Collect unqueued plates in original order
  for (const plate of project.plates) {
    if (!queueMap.has(plate.id)) {
      unqueued.push(plate);
    }
  }

  return [...queued, ...unqueued];
}

/**
 * Get a plate by ID from a project.
 */
export function getPlate(project: MultiPlateProject, plateId: string): BuildPlate | undefined {
  return project.plates.find((p) => p.id === plateId);
}

/**
 * Create a new build plate with defaults.
 */
export function createPlate(
  id: string,
  name: string,
  parts: BuildPlate["parts"] = [],
  profileOverrides: BuildPlate["profileOverrides"] = {},
): BuildPlate {
  return { id, name, profileOverrides, parts };
}

/**
 * Add a part to a plate.
 */
export function addPartToPlate(
  plate: BuildPlate,
  part: BuildPlate["parts"][number],
): BuildPlate {
  return {
    ...plate,
    parts: [...plate.parts, part],
  };
}

/**
 * Reorder the plate queue.
 */
export function setPlateQueue(
  project: MultiPlateProject,
  plateIds: string[],
): MultiPlateProject {
  return {
    ...project,
    queue: plateIds.map((plateId, i) => ({ plateId, sequence: i })),
  };
}
