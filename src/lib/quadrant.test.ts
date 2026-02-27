import { getQuadrantPriority } from "./quadrant";
import type { EisenhowerQuadrant } from "@/lib/storage";

describe("getQuadrantPriority — known quadrants", () => {
  it("returns 0 for urgent-important", () => {
    expect(getQuadrantPriority("urgent-important")).toBe(0);
  });

  it("returns 1 for not-urgent-important", () => {
    expect(getQuadrantPriority("not-urgent-important")).toBe(1);
  });

  it("returns 2 for urgent-not-important", () => {
    expect(getQuadrantPriority("urgent-not-important")).toBe(2);
  });

  it("returns 3 for not-urgent-not-important", () => {
    expect(getQuadrantPriority("not-urgent-not-important")).toBe(3);
  });
});

describe("getQuadrantPriority — null quadrant", () => {
  it("returns 3 (lowest priority) for null", () => {
    expect(getQuadrantPriority(null)).toBe(3);
  });
});

describe("getQuadrantPriority — sort ordering", () => {
  it("produces correct sort order when used as comparator", () => {
    const quadrants: (EisenhowerQuadrant | null)[] = [
      "not-urgent-not-important",
      null,
      "urgent-important",
      "urgent-not-important",
      "not-urgent-important",
    ];
    const sorted = [...quadrants].sort(
      (a, b) => getQuadrantPriority(a) - getQuadrantPriority(b),
    );
    expect(sorted).toEqual([
      "urgent-important",
      "not-urgent-important",
      "urgent-not-important",
      "not-urgent-not-important",
      null,
    ]);
  });
});
