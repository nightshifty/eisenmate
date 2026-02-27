import {
  getTodos,
  saveTodos,
  getSettings,
  saveSettings,
  getSessions,
  saveSessions,
  getTimerState,
  saveTimerState,
  clearTimerState,
  generateId,
  type Todo,
  type Session,
  type TimerState,
} from "./storage";

beforeEach(() => {
  localStorage.clear();
});

describe("generateId", () => {
  it("returns a valid UUID", () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("returns unique values", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });
});

describe("todos storage", () => {
  it("returns empty array when nothing saved", () => {
    expect(getTodos()).toEqual([]);
  });

  it("round-trips todos", () => {
    const todos: Todo[] = [
      {
        id: "1",
        content: "Test",
        estimationMinutes: 25,
        timeSpentMinutes: 0,
        done: false,
        createdAt: "2025-01-01T00:00:00.000Z",
        completedAt: null,
        quadrant: null,
        updatedAt: 1700000000000,
      },
    ];
    saveTodos(todos);
    expect(getTodos()).toEqual(todos);
  });

  it("migrates old todos without quadrant field", () => {
    const oldTodos = [
      {
        id: "1",
        content: "Old task",
        estimationMinutes: 25,
        timeSpentMinutes: 0,
        done: false,
        createdAt: "2025-01-01T00:00:00.000Z",
        completedAt: null,
      },
    ];
    localStorage.setItem("eisenmate_todos", JSON.stringify(oldTodos));
    const result = getTodos();
    expect(result[0].quadrant).toBeNull();
  });

  it("returns fallback on corrupted data", () => {
    localStorage.setItem("eisenmate_todos", "not-json");
    expect(getTodos()).toEqual([]);
  });
});

describe("settings storage", () => {
  it("returns default settings when nothing saved", () => {
    expect(getSettings()).toEqual({
      pomodoroMinutes: 25,
      breakMinutes: 5,
      overtimeMaxMinutes: 90,
      overtimeChimeIntervalMinutes: 5,
      allowEarlyFinish: true,
      silentMode: false,
      sessionTimerEnabled: true,
      updatedAt: 0,
    });
  });

  it("round-trips settings", () => {
    saveSettings({ pomodoroMinutes: 45, breakMinutes: 10, overtimeMaxMinutes: 60, overtimeChimeIntervalMinutes: 10, allowEarlyFinish: false, silentMode: false, sessionTimerEnabled: true, updatedAt: 1700000000000 });
    expect(getSettings()).toEqual({
      pomodoroMinutes: 45,
      breakMinutes: 10,
      overtimeMaxMinutes: 60,
      overtimeChimeIntervalMinutes: 10,
      allowEarlyFinish: false,
      silentMode: false,
      sessionTimerEnabled: true,
      updatedAt: 1700000000000,
    });
  });

  it("merges partial saved settings with defaults", () => {
    // Simulate old saved data that only has pomodoroMinutes
    localStorage.setItem("eisenmate_settings", JSON.stringify({ pomodoroMinutes: 30 }));
    expect(getSettings()).toEqual({
      pomodoroMinutes: 30,
      breakMinutes: 5,
      overtimeMaxMinutes: 90,
      overtimeChimeIntervalMinutes: 5,
      allowEarlyFinish: true,
      silentMode: false,
      sessionTimerEnabled: true,
      updatedAt: 0,
    });
  });
});

describe("sessions storage", () => {
  it("returns empty array when nothing saved", () => {
    expect(getSessions()).toEqual([]);
  });

  it("round-trips sessions", () => {
    const sessions: Session[] = [
      {
        id: "s1",
        todoId: "t1",
        todoContent: "Work",
        durationMinutes: 25,
        completedAt: "2025-01-01T00:00:00.000Z",
      },
    ];
    saveSessions(sessions);
    expect(getSessions()).toEqual(sessions);
  });
});

describe("timer state storage", () => {
  it("returns null when nothing saved", () => {
    expect(getTimerState()).toBeNull();
  });

  it("saves and reads running state", () => {
    const state: TimerState = {
      status: "running",
      endTime: Date.now() + 60000,
      pomodoroMinutes: 25,
      activeTodoId: "todo-1",
    };
    saveTimerState(state);
    expect(getTimerState()).toEqual(state);
  });

  it("saves and reads paused state", () => {
    const state: TimerState = {
      status: "paused",
      remainingMs: 300000,
      pomodoroMinutes: 25,
      activeTodoId: null,
    };
    saveTimerState(state);
    expect(getTimerState()).toEqual(state);
  });

  it("clears timer state", () => {
    saveTimerState({
      status: "running",
      endTime: Date.now() + 60000,
      pomodoroMinutes: 25,
      activeTodoId: null,
    });
    clearTimerState();
    expect(getTimerState()).toBeNull();
  });

  it("returns null on corrupted data", () => {
    localStorage.setItem("eisenmate_timer", "{broken");
    expect(getTimerState()).toBeNull();
  });
});
