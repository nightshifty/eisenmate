import { formatDuration } from "./format";

describe("formatDuration — sub-minute values", () => {
  it("returns '< 1 min' for 0", () => {
    expect(formatDuration(0)).toBe("< 1 min");
  });

  it("returns '< 1 min' for fractional values below 1", () => {
    expect(formatDuration(0.5)).toBe("< 1 min");
  });
});

describe("formatDuration — minutes only", () => {
  it("formats 1 minute", () => {
    expect(formatDuration(1)).toBe("1 min");
  });

  it("formats 25 minutes", () => {
    expect(formatDuration(25)).toBe("25 min");
  });

  it("formats 59 minutes", () => {
    expect(formatDuration(59)).toBe("59 min");
  });
});

describe("formatDuration — hours only", () => {
  it("formats exactly 1 hour", () => {
    expect(formatDuration(60)).toBe("1 h");
  });

  it("formats exactly 2 hours", () => {
    expect(formatDuration(120)).toBe("2 h");
  });
});

describe("formatDuration — hours and minutes", () => {
  it("formats 1 h 30 min", () => {
    expect(formatDuration(90)).toBe("1 h 30 min");
  });

  it("formats 2 h 15 min", () => {
    expect(formatDuration(135)).toBe("2 h 15 min");
  });
});
