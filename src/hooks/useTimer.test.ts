import { renderHook, act } from "@testing-library/react";
import { useTimer } from "./useTimer";
import { getTimerState, saveTimerState } from "@/lib/storage";

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useTimer — initial state", () => {
  it("starts idle with correct time", () => {
    const { result } = renderHook(() => useTimer(25));
    expect(result.current.status).toBe("idle");
    expect(result.current.minutes).toBe(25);
    expect(result.current.seconds).toBe(0);
    expect(result.current.progress).toBe(0);
  });
});

describe("useTimer — start / pause / reset", () => {
  it("start sets status to running", () => {
    const { result } = renderHook(() => useTimer(25));
    act(() => result.current.start());
    expect(result.current.status).toBe("running");
  });

  it("start persists running state to localStorage", () => {
    const { result } = renderHook(() => useTimer(25));
    act(() => result.current.start());
    const saved = getTimerState();
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe("running");
    expect(saved!.endTime).toBeGreaterThan(Date.now());
    expect(saved!.pomodoroMinutes).toBe(25);
  });

  it("start persists activeTodoId", () => {
    const { result } = renderHook(() => useTimer(25, "todo-42"));
    act(() => result.current.start());
    expect(getTimerState()!.activeTodoId).toBe("todo-42");
  });

  it("pause sets status to paused and persists", () => {
    const { result } = renderHook(() => useTimer(25));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    act(() => result.current.pause());
    expect(result.current.status).toBe("paused");

    const saved = getTimerState();
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe("paused");
    expect(saved!.remainingMs).toBeLessThan(25 * 60 * 1000);
    expect(saved!.remainingMs).toBeGreaterThan(0);
  });

  it("reset clears persisted state", () => {
    const { result } = renderHook(() => useTimer(25));
    act(() => result.current.start());
    act(() => result.current.reset());
    expect(result.current.status).toBe("idle");
    expect(getTimerState()).toBeNull();
  });
});

describe("useTimer — countdown", () => {
  it("counts down while running", () => {
    const { result } = renderHook(() => useTimer(1));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.remainingMs).toBeLessThan(60_000);
    expect(result.current.remainingMs).toBeGreaterThan(40_000);
  });

  it("completes and clears storage when time is up", () => {
    const { result } = renderHook(() => useTimer(1));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(result.current.status).toBe("completed");
    expect(result.current.remainingMs).toBe(0);
    expect(getTimerState()).toBeNull();
  });
});

describe("useTimer — restore from localStorage", () => {
  it("restores a running timer with correct remaining time", () => {
    const endTime = Date.now() + 120_000; // 2 minutes from now
    saveTimerState({
      status: "running",
      endTime,
      pomodoroMinutes: 25,
      activeTodoId: null,
    });

    const { result } = renderHook(() => useTimer(25));
    expect(result.current.status).toBe("running");
    expect(result.current.remainingMs).toBeLessThanOrEqual(120_000);
    expect(result.current.remainingMs).toBeGreaterThan(119_000);
  });

  it("restores a paused timer", () => {
    saveTimerState({
      status: "paused",
      remainingMs: 300_000,
      pomodoroMinutes: 25,
      activeTodoId: "todo-1",
    });

    const { result } = renderHook(() => useTimer(25));
    expect(result.current.status).toBe("paused");
    expect(result.current.remainingMs).toBe(300_000);
  });

  it("marks as completed if timer expired during reload", () => {
    saveTimerState({
      status: "running",
      endTime: Date.now() - 5000, // expired 5s ago
      pomodoroMinutes: 25,
      activeTodoId: null,
    });

    const { result } = renderHook(() => useTimer(25));
    expect(result.current.status).toBe("completed");
    expect(result.current.remainingMs).toBe(0);
    // Storage should be cleared
    expect(getTimerState()).toBeNull();
  });

  it("resumes ticking after restoring a running timer", () => {
    const endTime = Date.now() + 60_000;
    saveTimerState({
      status: "running",
      endTime,
      pomodoroMinutes: 25,
      activeTodoId: null,
    });

    const { result } = renderHook(() => useTimer(25));
    expect(result.current.status).toBe("running");

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current.remainingMs).toBeLessThan(51_000);
    expect(result.current.remainingMs).toBeGreaterThan(49_000);
  });
});

describe("useTimer — activeTodoId updates", () => {
  it("updates persisted state when activeTodoId changes while running", () => {
    const { result, rerender } = renderHook(
      ({ todoId }) => useTimer(25, todoId),
      { initialProps: { todoId: "todo-1" as string | null } },
    );

    act(() => result.current.start());
    expect(getTimerState()!.activeTodoId).toBe("todo-1");

    rerender({ todoId: "todo-2" });
    expect(getTimerState()!.activeTodoId).toBe("todo-2");
  });
});

describe("useTimer — defaultMinutes change while idle", () => {
  it("updates remainingMs when defaultMinutes changes and timer is idle", () => {
    const { result, rerender } = renderHook(
      ({ mins }) => useTimer(mins),
      { initialProps: { mins: 25 } },
    );

    expect(result.current.minutes).toBe(25);
    rerender({ mins: 45 });
    expect(result.current.minutes).toBe(45);
  });
});
