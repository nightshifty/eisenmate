import { renderHook, act } from "@testing-library/react";
import { useBreakTimer } from "./useBreakTimer";

const STORAGE_KEY = "eisenmate_break";

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useBreakTimer — initial state", () => {
  it("starts idle with correct time", () => {
    const { result } = renderHook(() => useBreakTimer({ defaultMinutes: 5 }));
    expect(result.current.status).toBe("idle");
    expect(result.current.minutes).toBe(5);
    expect(result.current.seconds).toBe(0);
    expect(result.current.progress).toBe(0);
    expect(result.current.isOvertime).toBe(false);
  });
});

describe("useBreakTimer — start / skip", () => {
  it("start sets status to running", () => {
    const { result } = renderHook(() => useBreakTimer({ defaultMinutes: 5 }));
    act(() => result.current.start());
    expect(result.current.status).toBe("running");
  });

  it("start persists running state to localStorage", () => {
    const { result } = renderHook(() => useBreakTimer({ defaultMinutes: 5 }));
    act(() => result.current.start());
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved).not.toBeNull();
    expect(saved.status).toBe("running");
    expect(saved.endTime).toBeGreaterThan(Date.now());
    expect(saved.breakMinutes).toBe(5);
  });

  it("skip clears state and returns to idle", () => {
    const { result } = renderHook(() => useBreakTimer({ defaultMinutes: 5 }));
    act(() => result.current.start());
    act(() => result.current.skip());
    expect(result.current.status).toBe("idle");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("start is ignored when not idle", () => {
    const { result } = renderHook(() => useBreakTimer({ defaultMinutes: 5 }));
    act(() => result.current.start());
    expect(result.current.status).toBe("running");
    // Try starting again — should be ignored
    act(() => result.current.start());
    expect(result.current.status).toBe("running");
  });
});

describe("useBreakTimer — countdown", () => {
  it("counts down while running", () => {
    const { result } = renderHook(() => useBreakTimer({ defaultMinutes: 1 }));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.remainingMs).toBeLessThan(60_000);
    expect(result.current.remainingMs).toBeGreaterThan(40_000);
  });

  it("enters overtime when time is up", () => {
    const { result } = renderHook(() => useBreakTimer({ defaultMinutes: 1 }));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(result.current.status).toBe("overtime");
    expect(result.current.isOvertime).toBe(true);
    expect(result.current.remainingMs).toBeLessThan(0);
  });
});

describe("useBreakTimer — overtime", () => {
  it("auto-completes when overtime max is reached", () => {
    const { result } = renderHook(() =>
      useBreakTimer({ defaultMinutes: 1, overtimeMaxMinutes: 2 }),
    );
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(60_000 + 1_000); // enter overtime
    });
    expect(result.current.status).toBe("overtime");

    act(() => {
      vi.advanceTimersByTime(120_000 + 1_000); // exceed overtime max
    });
    expect(result.current.status).toBe("completed");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("skip from overtime goes back to idle", () => {
    const { result } = renderHook(() => useBreakTimer({ defaultMinutes: 1, overtimeMaxMinutes: 10 }));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(result.current.status).toBe("overtime");

    act(() => result.current.skip());
    expect(result.current.status).toBe("idle");
    expect(result.current.isOvertime).toBe(false);
    expect(result.current.minutes).toBe(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("useBreakTimer — restore from localStorage", () => {
  it("restores a running break timer", () => {
    const endTime = Date.now() + 120_000;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ status: "running", endTime, breakMinutes: 5 }),
    );

    const { result } = renderHook(() => useBreakTimer({ defaultMinutes: 5 }));
    expect(result.current.status).toBe("running");
    expect(result.current.remainingMs).toBeLessThanOrEqual(120_000);
    expect(result.current.remainingMs).toBeGreaterThan(119_000);
  });

  it("restores into overtime if break expired recently", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        status: "running",
        endTime: Date.now() - 30_000,
        breakMinutes: 5,
      }),
    );

    const { result } = renderHook(() =>
      useBreakTimer({ defaultMinutes: 5, overtimeMaxMinutes: 90 }),
    );
    expect(result.current.status).toBe("overtime");
    expect(result.current.isOvertime).toBe(true);
  });

  it("marks as completed if overtime limit exceeded during reload", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        status: "running",
        endTime: Date.now() - 100 * 60 * 1000,
        breakMinutes: 5,
      }),
    );

    const { result } = renderHook(() =>
      useBreakTimer({ defaultMinutes: 5, overtimeMaxMinutes: 90 }),
    );
    expect(result.current.status).toBe("completed");
  });
});

describe("useBreakTimer — defaultMinutes change while idle", () => {
  it("updates remainingMs when defaultMinutes changes and timer is idle", () => {
    const { result, rerender } = renderHook(
      ({ mins }) => useBreakTimer({ defaultMinutes: mins }),
      { initialProps: { mins: 5 } },
    );

    expect(result.current.minutes).toBe(5);
    rerender({ mins: 10 });
    expect(result.current.minutes).toBe(10);
  });
});
