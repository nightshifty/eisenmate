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
  exportAllData,
  importAllData,
  validateExportData,
  parseExportFile,
  getLastSyncedAt,
  setLastSyncedAt,
  getGoogleToken,
  saveGoogleToken,
  clearGoogleToken,
  getDeletedTodoIds,
  addDeletedTodoId,
  getDeletedSessionIds,
  addDeletedSessionId,
  pruneOldTombstones,
  type Todo,
  type Session,
  type TimerState,
  type ExportData,
  type GoogleTokenData,
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
        updatedAt: "2025-01-01T00:00:00.000Z",
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
    });
  });

  it("round-trips settings", () => {
    saveSettings({ pomodoroMinutes: 45, breakMinutes: 10, overtimeMaxMinutes: 60, overtimeChimeIntervalMinutes: 10, allowEarlyFinish: false, silentMode: false, sessionTimerEnabled: true });
    expect(getSettings()).toEqual({
      pomodoroMinutes: 45,
      breakMinutes: 10,
      overtimeMaxMinutes: 60,
      overtimeChimeIntervalMinutes: 10,
      allowEarlyFinish: false,
      silentMode: false,
      sessionTimerEnabled: true,
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
        updatedAt: "2025-01-01T00:00:00.000Z",
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

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

const makeTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: "todo-1",
  content: "Test task",
  estimationMinutes: 25,
  timeSpentMinutes: 0,
  done: false,
  createdAt: "2025-06-01T00:00:00.000Z",
  completedAt: null,
  quadrant: null,
  updatedAt: "2025-06-01T00:00:00.000Z",
  ...overrides,
});

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: "sess-1",
  todoId: "todo-1",
  todoContent: "Test task",
  durationMinutes: 25,
  completedAt: "2025-06-01T00:30:00.000Z",
  updatedAt: "2025-06-01T00:30:00.000Z",
  ...overrides,
});

describe("exportAllData", () => {
  it("returns correct structure with version and app id", () => {
    saveTodos([makeTodo()]);
    saveSessions([makeSession()]);
    localStorage.setItem("eisenmate_theme", "dark");

    const exported = exportAllData();

    expect(exported.version).toBe(1);
    expect(exported.app).toBe("eisenmate");
    expect(exported.exportedAt).toBeTruthy();
    expect(exported.data.todos).toHaveLength(1);
    expect(exported.data.sessions).toHaveLength(1);
    expect(exported.data.settings).toEqual(getSettings());
    expect(exported.data.theme).toBe("dark");
  });

  it("defaults theme to light when not set", () => {
    const exported = exportAllData();
    expect(exported.data.theme).toBe("light");
  });

  it("exports empty arrays when no data exists", () => {
    const exported = exportAllData();
    expect(exported.data.todos).toEqual([]);
    expect(exported.data.sessions).toEqual([]);
  });
});

describe("validateExportData", () => {
  const validExport: ExportData = {
    version: 1,
    app: "eisenmate",
    exportedAt: "2025-06-01T00:00:00.000Z",
    data: {
      todos: [],
      sessions: [],
      settings: getSettings(),
      theme: "light",
    },
  };

  it("accepts valid export data", () => {
    expect(validateExportData(validExport)).toBe(true);
  });

  it("rejects null", () => {
    expect(validateExportData(null)).toBe(false);
  });

  it("rejects non-object", () => {
    expect(validateExportData("string")).toBe(false);
  });

  it("rejects wrong app id", () => {
    expect(validateExportData({ ...validExport, app: "other" })).toBe(false);
  });

  it("rejects missing version", () => {
    expect(validateExportData({ ...validExport, version: undefined })).toBe(false);
  });

  it("rejects version 0", () => {
    expect(validateExportData({ ...validExport, version: 0 })).toBe(false);
  });

  it("rejects missing data", () => {
    expect(validateExportData({ ...validExport, data: undefined })).toBe(false);
  });

  it("rejects when todos is not an array", () => {
    expect(validateExportData({ ...validExport, data: { ...validExport.data, todos: "not-array" } })).toBe(false);
  });

  it("rejects when sessions is not an array", () => {
    expect(validateExportData({ ...validExport, data: { ...validExport.data, sessions: {} } })).toBe(false);
  });

  it("rejects when settings is null", () => {
    expect(validateExportData({ ...validExport, data: { ...validExport.data, settings: null } })).toBe(false);
  });
});

describe("parseExportFile", () => {
  it("parses valid JSON export", () => {
    const data: ExportData = {
      version: 1,
      app: "eisenmate",
      exportedAt: "2025-06-01T00:00:00.000Z",
      data: { todos: [], sessions: [], settings: getSettings(), theme: "light" },
    };
    const result = parseExportFile(JSON.stringify(data));
    expect(result.version).toBe(1);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseExportFile("{broken")).toThrow("storage.invalidJson");
  });

  it("throws on valid JSON but invalid structure", () => {
    expect(() => parseExportFile(JSON.stringify({ foo: "bar" }))).toThrow("storage.invalidBackup");
  });
});

describe("importAllData – replace mode", () => {
  it("replaces all data completely", () => {
    // Set up existing data
    saveTodos([makeTodo({ id: "existing-1", content: "Existing" })]);
    saveSessions([makeSession({ id: "existing-s1" })]);

    const importData: ExportData = {
      version: 1,
      app: "eisenmate",
      exportedAt: "2025-06-01T00:00:00.000Z",
      data: {
        todos: [makeTodo({ id: "new-1", content: "New task" })],
        sessions: [makeSession({ id: "new-s1" })],
        settings: { ...getSettings(), pomodoroMinutes: 50 },
        theme: "dark",
      },
    };

    importAllData(importData, "replace");

    expect(getTodos()).toHaveLength(1);
    expect(getTodos()[0].id).toBe("new-1");
    expect(getSessions()).toHaveLength(1);
    expect(getSessions()[0].id).toBe("new-s1");
    expect(getSettings().pomodoroMinutes).toBe(50);
    expect(localStorage.getItem("eisenmate_theme")).toBe("dark");
  });
});

describe("importAllData – merge mode", () => {
  it("adds new todos and sessions without removing existing ones", () => {
    saveTodos([makeTodo({ id: "existing-1", content: "Existing" })]);
    saveSessions([makeSession({ id: "existing-s1" })]);

    const importData: ExportData = {
      version: 1,
      app: "eisenmate",
      exportedAt: "2025-06-01T00:00:00.000Z",
      data: {
        todos: [makeTodo({ id: "new-1", content: "New task" })],
        sessions: [makeSession({ id: "new-s1" })],
        settings: { ...getSettings(), pomodoroMinutes: 50 },
        theme: "dark",
      },
    };

    importAllData(importData, "merge");

    expect(getTodos()).toHaveLength(2);
    expect(getTodos().map((t) => t.id).sort()).toEqual(["existing-1", "new-1"]);
    expect(getSessions()).toHaveLength(2);
    expect(getSettings().pomodoroMinutes).toBe(50);
    expect(localStorage.getItem("eisenmate_theme")).toBe("dark");
  });

  it("overwrites existing todos with same id when imported is newer", () => {
    saveTodos([makeTodo({ id: "shared-1", content: "Old content", updatedAt: "2025-06-01T00:00:00.000Z" })]);

    const importData: ExportData = {
      version: 1,
      app: "eisenmate",
      exportedAt: "2025-06-01T00:00:00.000Z",
      data: {
        todos: [makeTodo({ id: "shared-1", content: "Updated content", updatedAt: "2025-06-02T00:00:00.000Z" })],
        sessions: [],
        settings: getSettings(),
        theme: "light",
      },
    };

    importAllData(importData, "merge");

    expect(getTodos()).toHaveLength(1);
    expect(getTodos()[0].content).toBe("Updated content");
  });

  it("keeps existing todo when local is newer", () => {
    saveTodos([makeTodo({ id: "shared-1", content: "Local content", updatedAt: "2025-06-03T00:00:00.000Z" })]);

    const importData: ExportData = {
      version: 1,
      app: "eisenmate",
      exportedAt: "2025-06-01T00:00:00.000Z",
      data: {
        todos: [makeTodo({ id: "shared-1", content: "Remote content", updatedAt: "2025-06-01T00:00:00.000Z" })],
        sessions: [],
        settings: getSettings(),
        theme: "light",
      },
    };

    importAllData(importData, "merge");

    expect(getTodos()).toHaveLength(1);
    expect(getTodos()[0].content).toBe("Local content");
  });

  it("overwrites existing sessions with same id when imported is newer", () => {
    saveSessions([makeSession({ id: "shared-s1", durationMinutes: 10, updatedAt: "2025-06-01T00:00:00.000Z" })]);

    const importData: ExportData = {
      version: 1,
      app: "eisenmate",
      exportedAt: "2025-06-01T00:00:00.000Z",
      data: {
        todos: [],
        sessions: [makeSession({ id: "shared-s1", durationMinutes: 30, updatedAt: "2025-06-02T00:00:00.000Z" })],
        settings: getSettings(),
        theme: "light",
      },
    };

    importAllData(importData, "merge");

    expect(getSessions()).toHaveLength(1);
    expect(getSessions()[0].durationMinutes).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// updatedAt migration
// ---------------------------------------------------------------------------

describe("updatedAt migration", () => {
  it("adds updatedAt from createdAt for todos without updatedAt", () => {
    const oldTodos = [
      {
        id: "1",
        content: "Old",
        estimationMinutes: 25,
        timeSpentMinutes: 0,
        done: false,
        createdAt: "2025-01-01T00:00:00.000Z",
        completedAt: null,
        quadrant: null,
      },
    ];
    localStorage.setItem("eisenmate_todos", JSON.stringify(oldTodos));
    const result = getTodos();
    expect(result[0].updatedAt).toBe("2025-01-01T00:00:00.000Z");
  });

  it("adds updatedAt from completedAt for done todos without updatedAt", () => {
    const oldTodos = [
      {
        id: "1",
        content: "Done",
        estimationMinutes: 25,
        timeSpentMinutes: 25,
        done: true,
        createdAt: "2025-01-01T00:00:00.000Z",
        completedAt: "2025-01-02T00:00:00.000Z",
        quadrant: null,
      },
    ];
    localStorage.setItem("eisenmate_todos", JSON.stringify(oldTodos));
    const result = getTodos();
    expect(result[0].updatedAt).toBe("2025-01-02T00:00:00.000Z");
  });

  it("adds updatedAt from completedAt for sessions without updatedAt", () => {
    const oldSessions = [
      {
        id: "s1",
        todoId: null,
        todoContent: "Work",
        durationMinutes: 25,
        completedAt: "2025-01-01T12:00:00.000Z",
      },
    ];
    localStorage.setItem("eisenmate_sessions", JSON.stringify(oldSessions));
    const result = getSessions();
    expect(result[0].updatedAt).toBe("2025-01-01T12:00:00.000Z");
  });

  it("preserves existing updatedAt values", () => {
    const todos = [makeTodo({ updatedAt: "2025-03-01T00:00:00.000Z" })];
    saveTodos(todos);
    expect(getTodos()[0].updatedAt).toBe("2025-03-01T00:00:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// Sync metadata
// ---------------------------------------------------------------------------

describe("sync metadata storage", () => {
  it("returns null for lastSyncedAt when not set", () => {
    expect(getLastSyncedAt()).toBeNull();
  });

  it("round-trips lastSyncedAt", () => {
    setLastSyncedAt("2025-06-01T00:00:00.000Z");
    expect(getLastSyncedAt()).toBe("2025-06-01T00:00:00.000Z");
  });

  it("returns null for google token when not set", () => {
    expect(getGoogleToken()).toBeNull();
  });

  it("round-trips google token", () => {
    const token: GoogleTokenData = {
      accessToken: "ya29.test",
      expiresAt: Date.now() + 3600000,
      email: "test@example.com",
    };
    saveGoogleToken(token);
    expect(getGoogleToken()).toEqual(token);
  });

  it("clears google token", () => {
    const token: GoogleTokenData = {
      accessToken: "ya29.test",
      expiresAt: Date.now() + 3600000,
      email: "test@example.com",
    };
    saveGoogleToken(token);
    clearGoogleToken();
    expect(getGoogleToken()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tombstones (deletion tracking for sync)
// ---------------------------------------------------------------------------

describe("tombstone tracking", () => {
  it("returns empty arrays when no tombstones exist", () => {
    expect(getDeletedTodoIds()).toEqual([]);
    expect(getDeletedSessionIds()).toEqual([]);
  });

  it("records a deleted todo id", () => {
    addDeletedTodoId("todo-x");
    const tombstones = getDeletedTodoIds();
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0].id).toBe("todo-x");
    expect(tombstones[0].deletedAt).toBeTruthy();
  });

  it("does not duplicate tombstones for same id", () => {
    addDeletedTodoId("todo-x");
    addDeletedTodoId("todo-x");
    expect(getDeletedTodoIds()).toHaveLength(1);
  });

  it("records a deleted session id", () => {
    addDeletedSessionId("sess-x");
    const tombstones = getDeletedSessionIds();
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0].id).toBe("sess-x");
  });

  it("prunes old tombstones", () => {
    // Manually create an old tombstone
    localStorage.setItem("eisenmate_deleted_todo_ids", JSON.stringify([
      { id: "old", deletedAt: "2020-01-01T00:00:00.000Z" },
      { id: "recent", deletedAt: new Date().toISOString() },
    ]));
    pruneOldTombstones();
    const remaining = getDeletedTodoIds();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("recent");
  });
});

describe("importAllData – merge mode with tombstones", () => {
  it("removes locally present items that were deleted remotely", () => {
    // Local has todo-1 and session-1
    saveTodos([makeTodo({ id: "todo-1", content: "Local task" })]);
    saveSessions([makeSession({ id: "sess-1" })]);

    // Remote has them deleted (tombstoned) and doesn't include them
    const importData: ExportData = {
      version: 1,
      app: "eisenmate",
      exportedAt: "2025-06-01T00:00:00.000Z",
      data: {
        todos: [],
        sessions: [],
        settings: getSettings(),
        theme: "light",
        deletedTodoIds: [{ id: "todo-1", deletedAt: "2025-06-02T00:00:00.000Z" }],
        deletedSessionIds: [{ id: "sess-1", deletedAt: "2025-06-02T00:00:00.000Z" }],
      },
    };

    importAllData(importData, "merge");

    expect(getTodos()).toHaveLength(0);
    expect(getSessions()).toHaveLength(0);
  });

  it("removes remotely present items that were deleted locally", () => {
    // Local has no items but has tombstones
    saveTodos([]);
    saveSessions([]);
    addDeletedTodoId("todo-1");
    addDeletedSessionId("sess-1");

    // Remote still has the items
    const importData: ExportData = {
      version: 1,
      app: "eisenmate",
      exportedAt: "2025-06-01T00:00:00.000Z",
      data: {
        todos: [makeTodo({ id: "todo-1" })],
        sessions: [makeSession({ id: "sess-1" })],
        settings: getSettings(),
        theme: "light",
      },
    };

    importAllData(importData, "merge");

    expect(getTodos()).toHaveLength(0);
    expect(getSessions()).toHaveLength(0);
  });

  it("keeps non-tombstoned items while removing tombstoned ones", () => {
    saveTodos([
      makeTodo({ id: "keep", content: "Keep me" }),
      makeTodo({ id: "delete", content: "Delete me" }),
    ]);

    const importData: ExportData = {
      version: 1,
      app: "eisenmate",
      exportedAt: "2025-06-01T00:00:00.000Z",
      data: {
        todos: [],
        sessions: [],
        settings: getSettings(),
        theme: "light",
        deletedTodoIds: [{ id: "delete", deletedAt: "2025-06-02T00:00:00.000Z" }],
      },
    };

    importAllData(importData, "merge");

    const todos = getTodos();
    expect(todos).toHaveLength(1);
    expect(todos[0].id).toBe("keep");
  });
});
