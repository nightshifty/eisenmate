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
    sessionTimerEnabled: false,
    onSessionTimerStart: vi.fn(),
    onSessionTimerRecordPomodoro: vi.fn(),
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

    // User clicks "Finish" to finish the overtime pomodoro
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));

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
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));

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

describe("HomePage — double-click to override pomodoro duration", () => {
  it("allows changing the timer duration via double-click when idle", () => {
    renderHomePage({ pomodoroMinutes: 1 });

    // Timer should show 01:00
    expect(screen.getByText("01:00")).toBeInTheDocument();

    // Double-click on the timer display
    fireEvent.doubleClick(screen.getByText("01:00"));

    // Input should appear with the current minutes value
    const input = screen.getByRole("spinbutton");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(1);

    // Change the value to 3 minutes and confirm
    fireEvent.change(input, { target: { value: "3" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // Timer should now show 03:00
    expect(screen.getByText("03:00")).toBeInTheDocument();
  });

  it("uses the overridden duration for tracking on overtime stop", () => {
    const { addSession } = renderHomePage({ pomodoroMinutes: 1, overtimeMaxMinutes: 10 });

    // Override duration to 2 minutes
    fireEvent.doubleClick(screen.getByText("01:00"));
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "2" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("02:00")).toBeInTheDocument();

    // Start the timer
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    // Advance past the 2-minute override into overtime
    act(() => { vi.advanceTimersByTime(121_000); });

    // No session yet (only at overtime entry, not yet finished)
    expect(addSession).not.toHaveBeenCalled();

    // Advance 1 more minute into overtime
    act(() => { vi.advanceTimersByTime(60_000); });

    // Finish
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));

    // Session should record: 2 (overridden pomodoro) + 1 (overtime) = 3
    // This proves the override (2) is used instead of the settings value (1)
    expect(addSession).toHaveBeenCalledTimes(1);
    expect(addSession).toHaveBeenCalledWith(
      expect.objectContaining({ durationMinutes: 3 }),
    );
  });

  it("uses the overridden duration for tracking on early finish", () => {
    const { addSession } = renderHomePage({ pomodoroMinutes: 1, overtimeMaxMinutes: 10 });

    // Override duration to 3 minutes
    fireEvent.doubleClick(screen.getByText("01:00"));
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "3" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // Start the timer
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    // Advance 1 minute (still running, not yet at 3-minute mark)
    act(() => { vi.advanceTimersByTime(61_000); });

    // Early finish
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));

    // Session should record 1 minute of elapsed time
    expect(addSession).toHaveBeenCalledTimes(1);
    expect(addSession).toHaveBeenCalledWith(
      expect.objectContaining({ durationMinutes: 1 }),
    );
  });

  it("resets override after pomodoro cycle completes", () => {
    renderHomePage({ pomodoroMinutes: 1, overtimeMaxMinutes: 10 });

    // Override to 2 minutes
    fireEvent.doubleClick(screen.getByText("01:00"));
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "2" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("02:00")).toBeInTheDocument();

    // Start, go into overtime, finish
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    act(() => { vi.advanceTimersByTime(121_000); });
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));

    // Dismiss the completion dialog (no active task → "Finish Pomodoro")
    fireEvent.click(screen.getByRole("button", { name: /finish pomodoro$/i }));

    // Now in break phase — skip break
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));

    // Back to pomodoro idle — timer should show the original 1-minute settings value, not the 2-minute override
    expect(screen.getByText("01:00")).toBeInTheDocument();
  });

  it("resets override when user cancels the pomodoro", () => {
    renderHomePage({ pomodoroMinutes: 1 });

    // Override to 5 minutes
    fireEvent.doubleClick(screen.getByText("01:00"));
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "5" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("05:00")).toBeInTheDocument();

    // Start and then cancel
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    act(() => { vi.advanceTimersByTime(5_000); });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Timer should show the original 1-minute settings value
    expect(screen.getByText("01:00")).toBeInTheDocument();
  });

  it("cancels editing when pressing Escape", () => {
    renderHomePage({ pomodoroMinutes: 1 });

    fireEvent.doubleClick(screen.getByText("01:00"));
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "99" } });
    fireEvent.keyDown(input, { key: "Escape" });

    // Timer should still show the original value
    expect(screen.getByText("01:00")).toBeInTheDocument();
  });

  it("rejects invalid values (0, negative, > 120, non-numeric)", () => {
    renderHomePage({ pomodoroMinutes: 1 });

    // Try 0
    fireEvent.doubleClick(screen.getByText("01:00"));
    let input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("01:00")).toBeInTheDocument();

    // Try 121
    fireEvent.doubleClick(screen.getByText("01:00"));
    input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "121" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("01:00")).toBeInTheDocument();

    // Try non-numeric
    fireEvent.doubleClick(screen.getByText("01:00"));
    input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("01:00")).toBeInTheDocument();
  });

  it("does not allow double-click to edit when timer is running", () => {
    renderHomePage({ pomodoroMinutes: 1 });

    // Start the timer
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    act(() => { vi.advanceTimersByTime(1_000); });

    // Try double-clicking — the time text should not turn into an input
    const timerText = screen.getByText(/\d{2}:\d{2}/);
    fireEvent.doubleClick(timerText);

    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("confirms edit on blur", () => {
    renderHomePage({ pomodoroMinutes: 1 });

    fireEvent.doubleClick(screen.getByText("01:00"));
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "10" } });
    fireEvent.blur(input);

    expect(screen.getByText("10:00")).toBeInTheDocument();
  });
});
