import type { EisenhowerQuadrant } from "@/lib/storage";

export interface QuadrantConfig {
  key: EisenhowerQuadrant;
  labelKey: string;
  subtitleKey: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  dropBorderClass: string;
}

export const QUADRANTS: QuadrantConfig[] = [
  {
    key: "urgent-important",
    labelKey: "eisenhower.q1Label",
    subtitleKey: "eisenhower.q1Subtitle",
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-50 dark:bg-red-950/30",
    borderClass: "border-red-200 dark:border-red-900",
    dropBorderClass: "border-red-400 dark:border-red-500",
  },
  {
    key: "not-urgent-important",
    labelKey: "eisenhower.q2Label",
    subtitleKey: "eisenhower.q2Subtitle",
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
    borderClass: "border-blue-200 dark:border-blue-900",
    dropBorderClass: "border-blue-400 dark:border-blue-500",
  },
  {
    key: "urgent-not-important",
    labelKey: "eisenhower.q3Label",
    subtitleKey: "eisenhower.q3Subtitle",
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
    borderClass: "border-amber-200 dark:border-amber-900",
    dropBorderClass: "border-amber-400 dark:border-amber-500",
  },
  {
    key: "not-urgent-not-important",
    labelKey: "eisenhower.q4Label",
    subtitleKey: "eisenhower.q4Subtitle",
    colorClass: "text-gray-500 dark:text-gray-400",
    bgClass: "bg-gray-50 dark:bg-gray-900/30",
    borderClass: "border-gray-200 dark:border-gray-800",
    dropBorderClass: "border-gray-400 dark:border-gray-500",
  },
];

export const QUADRANT_MAP = Object.fromEntries(
  QUADRANTS.map((q) => [q.key, q]),
) as Record<EisenhowerQuadrant, QuadrantConfig>;

/** Used in select dropdowns — labels resolved at render time via t(). */
export const QUADRANT_OPTIONS: { value: EisenhowerQuadrant; labelKey: string }[] = QUADRANTS.map((q) => ({
  value: q.key,
  labelKey: q.labelKey,
}));
