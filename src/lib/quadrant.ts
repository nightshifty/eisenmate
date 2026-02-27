import type { EisenhowerQuadrant } from "@/lib/storage";

const QUADRANT_PRIORITY: Record<EisenhowerQuadrant, number> = {
  "urgent-important": 0,
  "not-urgent-important": 1,
  "urgent-not-important": 2,
  "not-urgent-not-important": 3,
};

/**
 * Returns a numeric priority for a given Eisenhower quadrant.
 * Lower numbers indicate higher priority. `null` defaults to the lowest
 * priority (same as "not-urgent-not-important").
 */
export function getQuadrantPriority(quadrant: EisenhowerQuadrant | null): number {
  if (quadrant === null) return 3;
  return QUADRANT_PRIORITY[quadrant];
}
