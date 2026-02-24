import { render, screen, fireEvent, act } from "@testing-library/react";
import { HomePage } from "./HomePage";

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  // Stub Notification.requestPermission (not provided by the global mock in setup.ts)
  globalThis.Notification = Object.assign(vi.fn(), {
    permission: "denied" as NotificationPermission,
    requestPermission: vi.fn().mockResolvedValue("denied" as NotificationPermission),
  }) as unknown as typeof Notification;
});

afterEach(() => {
  vi.useRealTimers();
});

function renderHomePage(overrides: { pomodoroMinutes?: number; overtimeMaxMinutes?: number } = {}) {
  const addSession = vi.fn<(session: { todoId: string | null; todoContent: string; durationMinutes: number; completedAt: string }) => void>();
  const trackTime = vi.fn();
  const props = {
    todos: [],
    todosLoading: false,
    addTodo: vi.fn(),
    deleteTodo: vi.fn(),
    trackTime,
    toggleDone: vi.fn(),
    pomodoroMinutes: overrides.pomodoroMinutes ?? 1,
    breakMinutes: 1,
    overtimeMaxMinutes: overrides.overtimeMaxMinutes ?? 5,
    overtimeChimeIntervalMinutes: 5,
    allowEarlyFinish: true,
    addSession,
    onTimerRunningChange: vi.fn(),
  };
  const result = render(<HomePage {...props} />);
  return { ...result, addSession, trackTime };
}

describe("HomePage — overtime session records actual duration", () => {
  it("records pomodoroMinutes + overtimeMinutes when user stops in overtime", () => {
    const { addSession } = renderHomePage({ pomodoroMinutes: 1, overtimeMaxMinutes: 10 });

    // Start the pomodoro
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    // Advance past the 1-minute pomodoro into overtime
    act(() => { vi.advanceTimersByTime(61_000); });

    // onPomodoroComplete was called at the zero-crossing, but should NOT create a session
    expect(addSession).not.toHaveBeenCalled();

    // Advance 2 more minutes into overtime
    act(() => { vi.advanceTimersByTime(120_000); });

    // User clicks "Abschließen" to finish the overtime pomodoro
    fireEvent.click(screen.getByRole("button", { name: /abschließen/i }));

    // Session should now be created with total duration: 1 (planned) + 2 (overtime) = 3 minutes
    expect(addSession).toHaveBeenCalledTimes(1);
    expect(addSession).toHaveBeenCalledWith(
      expect.objectContaining({ durationMinutes: 3 }),
    );
  });

  it("records pomodoroMinutes + 0 when user stops immediately at overtime start", () => {
    const { addSession } = renderHomePage({ pomodoroMinutes: 1, overtimeMaxMinutes: 10 });

    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    // Advance just past zero to enter overtime (< 1 min of overtime)
    act(() => { vi.advanceTimersByTime(61_000); });

    expect(addSession).not.toHaveBeenCalled();

    // Immediately click finish — 0 overtime minutes (< 60s)
    fireEvent.click(screen.getByRole("button", { name: /abschließen/i }));

    // Session should be created with just the planned duration (1 + 0)
    expect(addSession).toHaveBeenCalledTimes(1);
    expect(addSession).toHaveBeenCalledWith(
      expect.objectContaining({ durationMinutes: 1 }),
    );
  });

  it("records full duration when overtime max is reached automatically", () => {
    const { addSession } = renderHomePage({ pomodoroMinutes: 1, overtimeMaxMinutes: 2 });

    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    // Advance past the 1-minute pomodoro into overtime
    act(() => { vi.advanceTimersByTime(61_000); });

    expect(addSession).not.toHaveBeenCalled();

    // Advance past the 2-minute overtime max
    act(() => { vi.advanceTimersByTime(121_000); });

    // Session should be created with total duration: 1 (planned) + 2 (overtime) = 3 minutes
    expect(addSession).toHaveBeenCalledTimes(1);
    expect(addSession).toHaveBeenCalledWith(
      expect.objectContaining({ durationMinutes: 3 }),
    );
  });
});
