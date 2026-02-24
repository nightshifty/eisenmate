import type { EisenhowerQuadrant } from "@/lib/storage";

export interface QuadrantConfig {
  key: EisenhowerQuadrant;
  label: string;
  subtitle: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  dropBorderClass: string;
}

export const QUADRANTS: QuadrantConfig[] = [
  {
    key: "urgent-important",
    label: "Wichtig & Dringend",
    subtitle: "Sofort erledigen",
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-50 dark:bg-red-950/30",
    borderClass: "border-red-200 dark:border-red-900",
    dropBorderClass: "border-red-400 dark:border-red-500",
  },
  {
    key: "not-urgent-important",
    label: "Wichtig & Nicht Dringend",
    subtitle: "Einplanen",
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
    borderClass: "border-blue-200 dark:border-blue-900",
    dropBorderClass: "border-blue-400 dark:border-blue-500",
  },
  {
    key: "urgent-not-important",
    label: "Nicht Wichtig & Dringend",
    subtitle: "Delegieren",
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
    borderClass: "border-amber-200 dark:border-amber-900",
    dropBorderClass: "border-amber-400 dark:border-amber-500",
  },
  {
    key: "not-urgent-not-important",
    label: "Nicht Wichtig & Nicht Dringend",
    subtitle: "Eliminieren",
    colorClass: "text-gray-500 dark:text-gray-400",
    bgClass: "bg-gray-50 dark:bg-gray-900/30",
    borderClass: "border-gray-200 dark:border-gray-800",
    dropBorderClass: "border-gray-400 dark:border-gray-500",
  },
];

export const QUADRANT_MAP = Object.fromEntries(
  QUADRANTS.map((q) => [q.key, q]),
) as Record<EisenhowerQuadrant, QuadrantConfig>;

export const QUADRANT_OPTIONS: { value: EisenhowerQuadrant; label: string }[] = QUADRANTS.map((q) => ({
  value: q.key,
  label: q.label,
}));
