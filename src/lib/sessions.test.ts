import { groupByDay } from "./sessions";
import type { Session } from "@/lib/storage";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: overrides.id ?? "s-1",
    todoId: overrides.todoId ?? null,
    todoContent: overrides.todoContent ?? "Test task",
    durationMinutes: overrides.durationMinutes ?? 25,
    completedAt: overrides.completedAt ?? new Date().toISOString(),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  // Pin "now" to 2025-06-15T12:00:00Z (a Sunday)
  vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("groupByDay — empty input", () => {
  it("returns empty array for no sessions", () => {
    expect(groupByDay([], "Today", "Yesterday", "en-US")).toEqual([]);
  });
});

describe("groupByDay — today and yesterday labels", () => {
  it("labels sessions from today as 'Today'", () => {
    const session = makeSession({ completedAt: "2025-06-15T09:30:00Z" });
    const groups = groupByDay([session], "Today", "Yesterday", "en-US");
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Today");
    expect(groups[0].sessions).toHaveLength(1);
  });

  it("labels sessions from yesterday as 'Yesterday'", () => {
    const session = makeSession({ completedAt: "2025-06-14T18:00:00Z" });
    const groups = groupByDay([session], "Today", "Yesterday", "en-US");
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Yesterday");
  });

  it("uses locale-formatted date for older sessions", () => {
    const session = makeSession({ completedAt: "2025-06-10T10:00:00Z" });
    const groups = groupByDay([session], "Today", "Yesterday", "en-US");
    expect(groups).toHaveLength(1);
    // Should not be "Today" or "Yesterday"
    expect(groups[0].label).not.toBe("Today");
    expect(groups[0].label).not.toBe("Yesterday");
    // Should contain the date parts
    expect(groups[0].label).toMatch(/\d/);
  });
});

describe("groupByDay — grouping", () => {
  it("groups multiple sessions on the same day together", () => {
    const sessions = [
      makeSession({ id: "s-1", completedAt: "2025-06-15T08:00:00Z" }),
      makeSession({ id: "s-2", completedAt: "2025-06-15T14:00:00Z" }),
    ];
    const groups = groupByDay(sessions, "Today", "Yesterday", "en-US");
    expect(groups).toHaveLength(1);
    expect(groups[0].sessions).toHaveLength(2);
  });

  it("separates sessions from different days into different groups", () => {
    const sessions = [
      makeSession({ id: "s-1", completedAt: "2025-06-15T08:00:00Z" }),
      makeSession({ id: "s-2", completedAt: "2025-06-14T08:00:00Z" }),
      makeSession({ id: "s-3", completedAt: "2025-06-10T08:00:00Z" }),
    ];
    const groups = groupByDay(sessions, "Today", "Yesterday", "en-US");
    expect(groups).toHaveLength(3);
    expect(groups[0].label).toBe("Today");
    expect(groups[1].label).toBe("Yesterday");
  });
});

describe("groupByDay — preserves insertion order", () => {
  it("returns groups in the order they are first encountered", () => {
    const sessions = [
      makeSession({ id: "s-1", completedAt: "2025-06-14T08:00:00Z" }),
      makeSession({ id: "s-2", completedAt: "2025-06-15T08:00:00Z" }),
    ];
    const groups = groupByDay(sessions, "Today", "Yesterday", "en-US");
    // First encountered is yesterday, then today
    expect(groups[0].label).toBe("Yesterday");
    expect(groups[1].label).toBe("Today");
  });
});
