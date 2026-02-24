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
    const { result } = renderHook(() => useTimer({ defaultMinutes: 25 }));
    expect(result.current.status).toBe("idle");
    expect(result.current.minutes).toBe(25);
    expect(result.current.seconds).toBe(0);
    expect(result.current.progress).toBe(0);
    expect(result.current.isOvertime).toBe(false);
  });
});

describe("useTimer — start / pause / reset", () => {
  it("start sets status to running", () => {
    const { result } = renderHook(() => useTimer({ defaultMinutes: 25 }));
    act(() => result.current.start());
    expect(result.current.status).toBe("running");
  });

  it("start persists running state to localStorage", () => {
    const { result } = renderHook(() => useTimer({ defaultMinutes: 25 }));
    act(() => result.current.start());
    const saved = getTimerState();
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe("running");
    expect(saved!.endTime).toBeGreaterThan(Date.now());
    expect(saved!.pomodoroMinutes).toBe(25);
  });

  it("start persists activeTodoId", () => {
    const { result } = renderHook(() => useTimer({ defaultMinutes: 25, activeTodoId: "todo-42" }));
    act(() => result.current.start());
    expect(getTimerState()!.activeTodoId).toBe("todo-42");
  });

  it("pause sets status to paused and persists", () => {
    const { result } = renderHook(() => useTimer({ defaultMinutes: 25 }));
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
    const { result } = renderHook(() => useTimer({ defaultMinutes: 25 }));
    act(() => result.current.start());
    act(() => result.current.reset());
    expect(result.current.status).toBe("idle");
    expect(getTimerState()).toBeNull();
  });
});

describe("useTimer — countdown", () => {
  it("counts down while running", () => {
    const { result } = renderHook(() => useTimer({ defaultMinutes: 1 }));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.remainingMs).toBeLessThan(60_000);
    expect(result.current.remainingMs).toBeGreaterThan(40_000);
  });

  it("enters overtime instead of completing when time is up", () => {
    const { result } = renderHook(() => useTimer({ defaultMinutes: 1 }));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(result.current.status).toBe("overtime");
    expect(result.current.isOvertime).toBe(true);
    expect(result.current.remainingMs).toBeLessThan(0);
  });
});

describe("useTimer — overtime", () => {
  it("continues counting into negative after pomodoro ends", () => {
    const { result } = renderHook(() => useTimer({ defaultMinutes: 1, overtimeMaxMinutes: 10 }));
    act(() => result.current.start());
    // Advance past the 1-minute mark
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(result.current.status).toBe("overtime");
    expect(result.current.isOvertime).toBe(true);

    // Advance another 2 minutes into overtime
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(result.current.status).toBe("overtime");
    expect(result.current.overtimeMs).toBeGreaterThan(120_000);
    // Display should show ~3 minutes
    expect(result.current.minutes).toBeGreaterThanOrEqual(2);
  });

  it("progress stays at 100 during overtime", () => {
    const { result } = renderHook(() => useTimer({ defaultMinutes: 1, overtimeMaxMinutes: 10 }));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(90_000);
    });
    expect(result.current.progress).toBe(100);
  });

  it("auto-completes when overtime max is reached", () => {
    const { result } = renderHook(() =>
      useTimer({ defaultMinutes: 1, overtimeMaxMinutes: 2 }),
    );
    act(() => result.current.start());
    // Advance past pomodoro (1 min) + overtime max (2 min) = 3 min total
    act(() => {
      vi.advanceTimersByTime(60_000 + 1_000); // enter overtime
    });
    expect(result.current.status).toBe("overtime");

    act(() => {
      vi.advanceTimersByTime(120_000 + 1_000); // exceed overtime max
    });
    expect(result.current.status).toBe("completed");
    expect(getTimerState()).toBeNull();
  });

  it("pause is ignored in overtime", () => {
    const { result } = renderHook(() => useTimer({ defaultMinutes: 1, overtimeMaxMinutes: 10 }));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(result.current.status).toBe("overtime");

    act(() => result.current.pause());
    expect(result.current.status).toBe("overtime"); // still overtime, not paused
  });

  it("reset from overtime goes back to idle", () => {
    const { result } = renderHook(() => useTimer({ defaultMinutes: 1, overtimeMaxMinutes: 10 }));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(result.current.status).toBe("overtime");

    act(() => result.current.reset());
    expect(result.current.status).toBe("idle");
    expect(result.current.isOvertime).toBe(false);
    expect(result.current.minutes).toBe(1);
    expect(getTimerState()).toBeNull();
  });

  it("start is ignored in overtime", () => {
    const { result } = renderHook(() => useTimer({ defaultMinutes: 1, overtimeMaxMinutes: 10 }));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(result.current.status).toBe("overtime");

    act(() => result.current.start());
    expect(result.current.status).toBe("overtime"); // unchanged
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

    const { result } = renderHook(() => useTimer({ defaultMinutes: 25 }));
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

    const { result } = renderHook(() => useTimer({ defaultMinutes: 25 }));
    expect(result.current.status).toBe("paused");
    expect(result.current.remainingMs).toBe(300_000);
  });

  it("restores into overtime if timer expired recently within overtime limit", () => {
    saveTimerState({
      status: "running",
      endTime: Date.now() - 30_000, // expired 30s ago
      pomodoroMinutes: 25,
      activeTodoId: null,
    });

    const { result } = renderHook(() => useTimer({ defaultMinutes: 25, overtimeMaxMinutes: 90 }));
    expect(result.current.status).toBe("overtime");
    expect(result.current.isOvertime).toBe(true);
  });

  it("marks as completed if overtime limit exceeded during reload", () => {
    saveTimerState({
      status: "running",
      endTime: Date.now() - 100 * 60 * 1000, // expired 100 min ago, exceeds 90 min default
      pomodoroMinutes: 25,
      activeTodoId: null,
    });

    const { result } = renderHook(() => useTimer({ defaultMinutes: 25, overtimeMaxMinutes: 90 }));
    expect(result.current.status).toBe("completed");
  });

  it("resumes ticking after restoring a running timer", () => {
    const endTime = Date.now() + 60_000;
    saveTimerState({
      status: "running",
      endTime,
      pomodoroMinutes: 25,
      activeTodoId: null,
    });

    const { result } = renderHook(() => useTimer({ defaultMinutes: 25 }));
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
      ({ todoId }) => useTimer({ defaultMinutes: 25, activeTodoId: todoId }),
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
      ({ mins }) => useTimer({ defaultMinutes: mins }),
      { initialProps: { mins: 25 } },
    );

    expect(result.current.minutes).toBe(25);
    rerender({ mins: 45 });
    expect(result.current.minutes).toBe(45);
  });
});
