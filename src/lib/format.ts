/**
 * Formats a duration given in total minutes into a human-readable string.
 *
 * Examples:
 *   0.5  → "< 1 min"
 *   5    → "5 min"
 *   60   → "1 h"
 *   90   → "1 h 30 min"
 */
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes < 1) return "< 1 min";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}
