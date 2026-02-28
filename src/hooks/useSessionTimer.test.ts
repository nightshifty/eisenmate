import { renderHook, act } from "@testing-library/react";
import { useSessionTimer } from "./useSessionTimer";
import { getSessionTimerState } from "@/lib/storage";

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSessionTimer — initial state", () => {
  it("starts with no active session when enabled", () => {
    const { result } = renderHook(() => useSessionTimer(true));
    expect(result.current.isRunning).toBe(false);
    expect(result.current.pomodoroCount).toBe(0);
    expect(result.current.focusMinutes).toBe(0);
    expect(result.current.display).toBe("00:00");
  });

  it("does not start when disabled", () => {
    const { result } = renderHook(() => useSessionTimer(false));
    expect(result.current.isRunning).toBe(false);
  });
});

describe("useSessionTimer — start", () => {
  it("starts a session timer", () => {
    const { result } = renderHook(() => useSessionTimer(true));
    act(() => result.current.start());
    expect(result.current.isRunning).toBe(true);
    expect(getSessionTimerState()).not.toBeNull();
  });

  it("does not start when disabled", () => {
    const { result } = renderHook(() => useSessionTimer(false));
    act(() => result.current.start());
    expect(result.current.isRunning).toBe(false);
    expect(getSessionTimerState()).toBeNull();
  });

  it("does not double-start", () => {
    const { result } = renderHook(() => useSessionTimer(true));
    act(() => result.current.start());
    const startTime = getSessionTimerState()!.startTime;
    vi.advanceTimersByTime(5000);
    act(() => result.current.start());
    expect(getSessionTimerState()!.startTime).toBe(startTime);
  });
});

describe("useSessionTimer — elapsed display", () => {
  it("updates display over time", () => {
    const { result } = renderHook(() => useSessionTimer(true));
    act(() => result.current.start());

    // Advance 65 seconds
    act(() => vi.advanceTimersByTime(65_000));
    expect(result.current.display).toBe("01:05");

    // Advance another 3600s + 4*60s + 25s = 3865s => total 3930s = 1h 5m 30s
    act(() => vi.advanceTimersByTime(3600_000 + 4 * 60_000 + 25_000));
    expect(result.current.display).toBe("1:05:30");
  });
});

describe("useSessionTimer — recordPomodoro", () => {
  it("tracks pomodoro count and focus minutes", () => {
    const { result } = renderHook(() => useSessionTimer(true));
    act(() => result.current.start());

    act(() => result.current.recordPomodoro(25, "Task A"));
    expect(result.current.pomodoroCount).toBe(1);
    expect(result.current.focusMinutes).toBe(25);

    act(() => result.current.recordPomodoro(30, "Task B"));
    expect(result.current.pomodoroCount).toBe(2);
    expect(result.current.focusMinutes).toBe(55);
  });

  it("tracks longest pomodoro", () => {
    const { result } = renderHook(() => useSessionTimer(true));
    act(() => result.current.start());

    act(() => result.current.recordPomodoro(25, "Task A"));
    act(() => result.current.recordPomodoro(45, "Task B"));
    act(() => result.current.recordPomodoro(30, "Task C"));

    const summary = result.current.getSummary();
    expect(summary!.longestPomodoroMinutes).toBe(45);
  });

  it("tracks unique todo names", () => {
    const { result } = renderHook(() => useSessionTimer(true));
    act(() => result.current.start());

    act(() => result.current.recordPomodoro(25, "Task A"));
    act(() => result.current.recordPomodoro(25, "Task A")); // duplicate
    act(() => result.current.recordPomodoro(25, "Task B"));
    act(() => result.current.recordPomodoro(25, null)); // no task

    const summary = result.current.getSummary();
    expect(summary!.todoNames).toEqual(["Task A", "Task B"]);
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useSessionTimer(true));
    act(() => result.current.start());
    act(() => result.current.recordPomodoro(25, "Task A"));

    const saved = getSessionTimerState();
    expect(saved).not.toBeNull();
    expect(saved!.pomodoroCount).toBe(1);
    expect(saved!.focusMinutes).toBe(25);
    expect(saved!.todoNames).toEqual(["Task A"]);
  });
});

describe("useSessionTimer — getSummary + stop", () => {
  it("getSummary returns summary without clearing state", () => {
    const { result } = renderHook(() => useSessionTimer(true));
    act(() => result.current.start());

    // Advance 30 minutes
    act(() => vi.advanceTimersByTime(30 * 60_000));
    act(() => result.current.recordPomodoro(25, "Task A"));

    const summary = result.current.getSummary();

    expect(summary).not.toBeNull();
    expect(summary!.totalMinutes).toBe(30);
    expect(summary!.pomodoroCount).toBe(1);
    expect(summary!.focusMinutes).toBe(25);
    expect(summary!.productivityPercent).toBe(83); // 25/30 = 83%
    expect(summary!.longestPomodoroMinutes).toBe(25);
    expect(summary!.todoNames).toEqual(["Task A"]);

    // Session is still running
    expect(result.current.isRunning).toBe(true);
    expect(getSessionTimerState()).not.toBeNull();
  });

  it("getSummary includes startTime and endTime timestamps", () => {
    const { result } = renderHook(() => useSessionTimer(true));
    const beforeStart = Date.now();
    act(() => result.current.start());

    act(() => vi.advanceTimersByTime(10 * 60_000));

    const summary = result.current.getSummary();
    expect(summary).not.toBeNull();
    expect(summary!.startTime).toBeGreaterThanOrEqual(beforeStart);
    expect(summary!.endTime).toBeGreaterThan(summary!.startTime);
    expect(summary!.endTime - summary!.startTime).toBeGreaterThanOrEqual(10 * 60_000);
  });

  it("stop clears state", () => {
    const { result } = renderHook(() => useSessionTimer(true));
    act(() => result.current.start());
    act(() => result.current.recordPomodoro(25, "Task A"));

    act(() => result.current.stop());

    expect(result.current.isRunning).toBe(false);
    expect(getSessionTimerState()).toBeNull();
  });

  it("stop accepts optional adjusted start/end times", () => {
    const { result } = renderHook(() => useSessionTimer(true));
    act(() => result.current.start());
    act(() => result.current.recordPomodoro(25, "Task A"));

    const adjustedStart = Date.now() - 60 * 60_000;
    const adjustedEnd = Date.now() - 30 * 60_000;
    act(() => result.current.stop(adjustedStart, adjustedEnd));

    expect(result.current.isRunning).toBe(false);
    expect(getSessionTimerState()).toBeNull();
  });

  it("getSummary returns null when no session active", () => {
    const { result } = renderHook(() => useSessionTimer(true));
    expect(result.current.getSummary()).toBeNull();
  });
});

describe("useSessionTimer — persistence / restore", () => {
  it("restores state from localStorage on mount", () => {
    // Start and record
    const { result, unmount } = renderHook(() => useSessionTimer(true));
    act(() => result.current.start());
    act(() => result.current.recordPomodoro(25, "Task A"));
    unmount();

    // Re-mount — should restore
    const { result: result2 } = renderHook(() => useSessionTimer(true));
    expect(result2.current.isRunning).toBe(true);
    expect(result2.current.pomodoroCount).toBe(1);
  });

  it("does not restore when disabled", () => {
    // Start when enabled
    const { result, unmount } = renderHook(() => useSessionTimer(true));
    act(() => result.current.start());
    unmount();

    // Re-mount disabled — should not restore
    const { result: result2 } = renderHook(() => useSessionTimer(false));
    expect(result2.current.isRunning).toBe(false);
  });
});
