import { renderHook, act } from "@testing-library/react";
import { useSync } from "./useSync";

// Mock google-drive-sync
const mockSyncWithDrive = vi.fn();
const mockGetLastSync = vi.fn().mockReturnValue(null);

vi.mock("@/lib/google-drive-sync", () => ({
  syncWithDrive: (...args: unknown[]) => mockSyncWithDrive(...args),
  getLastSync: () => mockGetLastSync(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mockSyncWithDrive.mockResolvedValue({ status: "success", timestamp: "2025-06-01T12:00:00.000Z" });
  mockGetLastSync.mockReturnValue(null);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSync — initial state", () => {
  it("starts idle when not signed in", () => {
    const { result } = renderHook(() => useSync(false));

    expect(result.current.status).toBe("idle");
    expect(result.current.lastSyncedAt).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("reads last sync from storage", () => {
    mockGetLastSync.mockReturnValue("2025-06-01T10:00:00.000Z");
    const { result } = renderHook(() => useSync(false));

    expect(result.current.lastSyncedAt).toBe("2025-06-01T10:00:00.000Z");
  });
});

describe("useSync — auto-sync on mount", () => {
  it("syncs automatically when signed in", async () => {
    renderHook(() => useSync(true));

    // Flush the async sync
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockSyncWithDrive).toHaveBeenCalledTimes(1);
  });

  it("does not sync when not signed in", async () => {
    renderHook(() => useSync(false));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockSyncWithDrive).not.toHaveBeenCalled();
  });
});

describe("useSync — syncNow", () => {
  it("performs a sync and updates status", async () => {
    const { result } = renderHook(() => useSync(true));

    // Wait for auto-sync on mount
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    mockSyncWithDrive.mockClear();

    await act(async () => {
      await result.current.syncNow();
    });

    expect(mockSyncWithDrive).toHaveBeenCalledTimes(1);
    expect(result.current.lastSyncedAt).toBe("2025-06-01T12:00:00.000Z");
  });

  it("does nothing when not signed in", async () => {
    const { result } = renderHook(() => useSync(false));

    await act(async () => {
      await result.current.syncNow();
    });

    expect(mockSyncWithDrive).not.toHaveBeenCalled();
  });

  it("sets error status on failure", async () => {
    mockSyncWithDrive.mockResolvedValue({ status: "error", message: "Network error" });

    const { result } = renderHook(() => useSync(true));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Network error");
  });

  it("transitions from success to idle after timeout", async () => {
    // Use a deferred promise so we can control when sync resolves
    let resolveSync!: (value: { status: string; timestamp: string }) => void;
    mockSyncWithDrive.mockImplementation(
      () => new Promise((res) => { resolveSync = res; }),
    );

    const { result } = renderHook(() => useSync(true));

    // Status should be syncing after mount trigger
    await act(async () => {
      // Flush microtasks but NOT timers yet
      await Promise.resolve();
    });
    expect(result.current.status).toBe("syncing");

    // Resolve the sync
    await act(async () => {
      resolveSync({ status: "success", timestamp: "2025-06-01T12:00:00.000Z" });
      await Promise.resolve();
    });

    expect(result.current.status).toBe("success");

    // Advance just under SUCCESS_DISPLAY_MS — should still be success
    act(() => {
      vi.advanceTimersByTime(2900);
    });
    expect(result.current.status).toBe("success");

    // Advance past SUCCESS_DISPLAY_MS (3000ms total)
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.status).toBe("idle");
  });
});

describe("useSync — data-changed event triggers debounced sync", () => {
  it("syncs after debounce period when data changes", async () => {
    const { result } = renderHook(() => useSync(true));

    // Wait for initial auto-sync
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    mockSyncWithDrive.mockClear();

    // Simulate a data change event
    act(() => {
      window.dispatchEvent(new CustomEvent("eisenmate-data-changed"));
    });

    // Not yet synced (debounce period)
    expect(mockSyncWithDrive).not.toHaveBeenCalled();

    // Advance past debounce (5000ms)
    await act(async () => {
      vi.advanceTimersByTime(5500);
      await vi.runAllTimersAsync();
    });

    expect(mockSyncWithDrive).toHaveBeenCalledTimes(1);

    // Ensure status is available
    expect(["success", "idle"]).toContain(result.current.status);
  });

  it("does not sync on data-changed when not signed in", async () => {
    renderHook(() => useSync(false));

    act(() => {
      window.dispatchEvent(new CustomEvent("eisenmate-data-changed"));
    });

    await act(async () => {
      vi.advanceTimersByTime(6000);
      await vi.runAllTimersAsync();
    });

    expect(mockSyncWithDrive).not.toHaveBeenCalled();
  });
});

describe("useSync — visibility change triggers sync", () => {
  it("schedules sync when tab becomes visible", async () => {
    const { result } = renderHook(() => useSync(true));

    // Wait for initial auto-sync
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    mockSyncWithDrive.mockClear();

    // Simulate tab becoming visible
    Object.defineProperty(document, "visibilityState", { value: "visible", writable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(5500);
      await vi.runAllTimersAsync();
    });

    expect(mockSyncWithDrive).toHaveBeenCalledTimes(1);
    expect(["success", "idle"]).toContain(result.current.status);
  });
});
