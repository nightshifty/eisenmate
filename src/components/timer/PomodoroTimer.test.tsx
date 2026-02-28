import { render, screen, fireEvent, act } from "@testing-library/react";
import { PomodoroTimer } from "./PomodoroTimer";
import type { Todo } from "@/hooks/useTodos";

// ---- helpers ----------------------------------------------------------------

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: overrides.id ?? "todo-1",
    content: overrides.content ?? "Write tests",
    estimationMinutes: overrides.estimationMinutes ?? 25,
    timeSpentMinutes: overrides.timeSpentMinutes ?? 0,
    done: overrides.done ?? false,
    createdAt: overrides.createdAt ?? "2025-01-01T00:00:00.000Z",
    completedAt: overrides.completedAt ?? null,
    quadrant: overrides.quadrant ?? null,
    updatedAt: overrides.updatedAt ?? overrides.createdAt ?? "2025-01-01T00:00:00.000Z",
  };
}

interface RenderOptions {
  pomodoroMinutes?: number;
  breakMinutes?: number;
  overtimeMaxMinutes?: number;
  overtimeChimeIntervalMinutes?: number;
  allowEarlyFinish?: boolean;
  silentMode?: boolean;
  activeTodo?: Todo | null;
}

function renderTimer(options: RenderOptions = {}) {
  const onPomodoroComplete = vi.fn();
  const onEarlyFinish = vi.fn();
  const onOvertimeStop = vi.fn();
  const onToggleDone = vi.fn();
  const onStatusChange = vi.fn();

  const result = render(
    <PomodoroTimer
      pomodoroMinutes={options.pomodoroMinutes ?? 1}
      breakMinutes={options.breakMinutes ?? 1}
      overtimeMaxMinutes={options.overtimeMaxMinutes ?? 5}
      overtimeChimeIntervalMinutes={options.overtimeChimeIntervalMinutes ?? 5}
      allowEarlyFinish={options.allowEarlyFinish ?? true}
      silentMode={options.silentMode ?? true}
      activeTodo={options.activeTodo ?? null}
      onPomodoroComplete={onPomodoroComplete}
      onEarlyFinish={onEarlyFinish}
      onOvertimeStop={onOvertimeStop}
      onToggleDone={onToggleDone}
      onStatusChange={onStatusChange}
    >
      {(timerDisplay, controls) => (
        <div>
          <div data-testid="timer-display">{timerDisplay}</div>
          <div data-testid="controls">{controls}</div>
        </div>
      )}
    </PomodoroTimer>,
  );

  return {
    ...result,
    onPomodoroComplete,
    onEarlyFinish,
    onOvertimeStop,
    onToggleDone,
    onStatusChange,
  };
}

// ---- setup ------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  globalThis.Notification = Object.assign(vi.fn(), {
    permission: "denied" as NotificationPermission,
    requestPermission: vi.fn().mockResolvedValue("denied" as NotificationPermission),
  }) as unknown as typeof Notification;
});

afterEach(() => {
  vi.useRealTimers();
});

// ---- tests ------------------------------------------------------------------

describe("PomodoroTimer — initial render", () => {
  it("renders start button when idle", () => {
    renderTimer();
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
  });

  it("displays initial time matching pomodoroMinutes", () => {
    renderTimer({ pomodoroMinutes: 25 });
    expect(screen.getByText("25:00")).toBeInTheDocument();
  });

  it("renders children with timerDisplay and controls", () => {
    renderTimer();
    expect(screen.getByTestId("timer-display")).toBeInTheDocument();
    expect(screen.getByTestId("controls")).toBeInTheDocument();
  });
});

describe("PomodoroTimer — start and cancel", () => {
  it("shows cancel button in the first minute (before early finish)", () => {
    renderTimer();
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("cancel resets to idle", () => {
    renderTimer();
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    act(() => { vi.advanceTimersByTime(30_000); });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
  });

  it("cancel does not call any completion callbacks", () => {
    const { onPomodoroComplete, onEarlyFinish, onOvertimeStop } = renderTimer();
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    act(() => { vi.advanceTimersByTime(30_000); });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onPomodoroComplete).not.toHaveBeenCalled();
    expect(onEarlyFinish).not.toHaveBeenCalled();
    expect(onOvertimeStop).not.toHaveBeenCalled();
  });
});

describe("PomodoroTimer — early finish", () => {
  it("shows finish button after 1 minute when allowEarlyFinish is true", () => {
    renderTimer({ pomodoroMinutes: 5, allowEarlyFinish: true });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    act(() => { vi.advanceTimersByTime(61_000); });
    expect(screen.getByRole("button", { name: /finish/i })).toBeInTheDocument();
  });

  it("does not show finish button when allowEarlyFinish is false", () => {
    renderTimer({ pomodoroMinutes: 5, allowEarlyFinish: false });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    act(() => { vi.advanceTimersByTime(61_000); });
    // No finish button, no cancel button (past first minute)
    expect(screen.queryByRole("button", { name: /finish/i })).not.toBeInTheDocument();
  });

  it("calls onEarlyFinish with elapsed minutes and opens dialog", () => {
    const { onEarlyFinish } = renderTimer({ pomodoroMinutes: 5, allowEarlyFinish: true });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    // Advance 2 minutes
    act(() => { vi.advanceTimersByTime(120_000); });
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));

    expect(onEarlyFinish).toHaveBeenCalledWith(2);
  });
});

describe("PomodoroTimer — overtime", () => {
  it("calls onPomodoroComplete when entering overtime", () => {
    const { onPomodoroComplete } = renderTimer({ pomodoroMinutes: 1 });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    act(() => { vi.advanceTimersByTime(61_000); });
    expect(onPomodoroComplete).toHaveBeenCalledWith(1);
  });

  it("shows finish button during overtime", () => {
    renderTimer({ pomodoroMinutes: 1 });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    act(() => { vi.advanceTimersByTime(61_000); });
    expect(screen.getByRole("button", { name: /finish/i })).toBeInTheDocument();
  });

  it("calls onOvertimeStop when user finishes during overtime", () => {
    const { onOvertimeStop } = renderTimer({ pomodoroMinutes: 1 });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    // Enter overtime
    act(() => { vi.advanceTimersByTime(61_000); });
    // Stay in overtime for 2 more minutes
    act(() => { vi.advanceTimersByTime(120_000); });

    fireEvent.click(screen.getByRole("button", { name: /finish/i }));
    expect(onOvertimeStop).toHaveBeenCalledWith(2, 1);
  });
});

describe("PomodoroTimer — task completion dialog (with activeTodo)", () => {
  it("shows task completion dialog with 3 options after early finish", () => {
    renderTimer({ pomodoroMinutes: 5, activeTodo: makeTodo(), allowEarlyFinish: true });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    act(() => { vi.advanceTimersByTime(120_000); });
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));

    // 3 buttons: "Yes, done!", "No, still open", "Abort"
    expect(screen.getByRole("button", { name: /yes.*done/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /no.*still open/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /abort/i })).toBeInTheDocument();
  });

  it("marks task as done when 'Yes, done!' is clicked", () => {
    const { onToggleDone } = renderTimer({
      pomodoroMinutes: 5,
      activeTodo: makeTodo({ id: "todo-42" }),
      allowEarlyFinish: true,
    });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    act(() => { vi.advanceTimersByTime(120_000); });
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));
    fireEvent.click(screen.getByRole("button", { name: /yes.*done/i }));

    expect(onToggleDone).toHaveBeenCalledWith("todo-42", true);
  });

  it("does not mark task as done when 'No, still open' is clicked", () => {
    const { onToggleDone } = renderTimer({
      pomodoroMinutes: 5,
      activeTodo: makeTodo(),
      allowEarlyFinish: true,
    });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    act(() => { vi.advanceTimersByTime(120_000); });
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));
    fireEvent.click(screen.getByRole("button", { name: /no.*still open/i }));

    expect(onToggleDone).not.toHaveBeenCalled();
  });

  it("transitions to break phase after 'No, still open'", () => {
    renderTimer({
      pomodoroMinutes: 5,
      activeTodo: makeTodo(),
      allowEarlyFinish: true,
    });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    act(() => { vi.advanceTimersByTime(120_000); });
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));
    fireEvent.click(screen.getByRole("button", { name: /no.*still open/i }));

    // Should now be in break phase
    expect(screen.getByText(/break/i)).toBeInTheDocument();
  });

  it("resets to pomodoro idle after 'Abort'", () => {
    renderTimer({
      pomodoroMinutes: 5,
      activeTodo: makeTodo(),
      allowEarlyFinish: true,
    });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    act(() => { vi.advanceTimersByTime(120_000); });
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));
    fireEvent.click(screen.getByRole("button", { name: /abort/i }));

    // Should be back to idle with Start button
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
  });
});

describe("PomodoroTimer — task completion dialog (without activeTodo)", () => {
  it("shows dialog with 2 options (no 'Yes, done!') when no activeTodo", () => {
    renderTimer({ pomodoroMinutes: 1 });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    // Enter overtime
    act(() => { vi.advanceTimersByTime(61_000); });
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));

    expect(screen.queryByRole("button", { name: /yes.*done/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /finish pomodoro$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /abort/i })).toBeInTheDocument();
  });

  it("transitions to break after clicking 'Finish Pomodoro'", () => {
    renderTimer({ pomodoroMinutes: 1 });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    act(() => { vi.advanceTimersByTime(61_000); });
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));
    fireEvent.click(screen.getByRole("button", { name: /finish pomodoro$/i }));

    expect(screen.getByText(/break/i)).toBeInTheDocument();
  });
});

describe("PomodoroTimer — break phase", () => {
  it("shows skip button during break", () => {
    renderTimer({ pomodoroMinutes: 1 });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    // Go through full pomodoro + overtime finish
    act(() => { vi.advanceTimersByTime(61_000); });
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));
    fireEvent.click(screen.getByRole("button", { name: /finish pomodoro$/i }));

    expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
  });

  it("returns to pomodoro phase after skipping break", () => {
    renderTimer({ pomodoroMinutes: 1 });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    act(() => { vi.advanceTimersByTime(61_000); });
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));
    fireEvent.click(screen.getByRole("button", { name: /finish pomodoro$/i }));

    // Skip the break
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));

    // Back to pomodoro with start button
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
  });
});

describe("PomodoroTimer — status reporting", () => {
  it("reports 'idle' initially", () => {
    const { onStatusChange } = renderTimer();
    expect(onStatusChange).toHaveBeenCalledWith("idle");
  });

  it("reports 'running' after start", () => {
    const { onStatusChange } = renderTimer();
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(onStatusChange).toHaveBeenCalledWith("running");
  });

  it("reports 'break' during break phase", () => {
    const { onStatusChange } = renderTimer({ pomodoroMinutes: 1 });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    act(() => { vi.advanceTimersByTime(61_000); });
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));
    fireEvent.click(screen.getByRole("button", { name: /finish pomodoro$/i }));

    expect(onStatusChange).toHaveBeenCalledWith("break");
  });
});
