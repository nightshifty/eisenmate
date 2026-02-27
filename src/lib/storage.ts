export type EisenhowerQuadrant =
  | "urgent-important"
  | "not-urgent-important"
  | "urgent-not-important"
  | "not-urgent-not-important";

export interface Todo {
  id: string;
  content: string;
  estimationMinutes: number;
  timeSpentMinutes: number;
  done: boolean;
  createdAt: string;
  completedAt: string | null;
  quadrant: EisenhowerQuadrant | null;
}

export interface Session {
  id: string;
  todoId: string | null;
  todoContent: string;
  durationMinutes: number;
  completedAt: string;
}

export interface UserSettings {
  pomodoroMinutes: number;
  breakMinutes: number;
  overtimeMaxMinutes: number;
  overtimeChimeIntervalMinutes: number;
  allowEarlyFinish: boolean;
  silentMode: boolean;
  sessionTimerEnabled: boolean;
}

export interface SessionTimerState {
  startTime: number; // Date.now() when session started
  pomodoroCount: number;
  focusMinutes: number; // total productive minutes
  longestPomodoroMinutes: number;
  todoNames: string[]; // unique task names worked on
  sessionSessions: string[]; // IDs of sessions created during this session timer
}

export interface TimerState {
  status: "running" | "paused";
  phase?: "pomodoro" | "break";
  endTime?: number;
  remainingMs?: number;
  pomodoroMinutes: number;
  activeTodoId: string | null;
}

const KEYS = {
  todos: "eisenmate_todos",
  settings: "eisenmate_settings",
  sessions: "eisenmate_sessions",
  timer: "eisenmate_timer",
  sessionTimer: "eisenmate_session_timer",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getTodos(): Todo[] {
  const todos = read<Todo[]>(KEYS.todos, []);
  return todos.map((t) => ({
    ...t,
    quadrant: t.quadrant ?? null,
  }));
}

export function saveTodos(todos: Todo[]): void {
  write(KEYS.todos, todos);
}

const DEFAULT_SETTINGS: UserSettings = {
  pomodoroMinutes: 25,
  breakMinutes: 5,
  overtimeMaxMinutes: 90,
  overtimeChimeIntervalMinutes: 5,
  allowEarlyFinish: true,
  silentMode: false,
  sessionTimerEnabled: true,
};

export function getSettings(): UserSettings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<UserSettings>>(KEYS.settings, {}) };
}

export function saveSettings(settings: UserSettings): void {
  write(KEYS.settings, settings);
}

export function getSessions(): Session[] {
  return read<Session[]>(KEYS.sessions, []);
}

export function saveSessions(sessions: Session[]): void {
  write(KEYS.sessions, sessions);
}

export function getTimerState(): TimerState | null {
  return read<TimerState | null>(KEYS.timer, null);
}

export function saveTimerState(state: TimerState): void {
  write(KEYS.timer, state);
}

export function clearTimerState(): void {
  localStorage.removeItem(KEYS.timer);
}

export function getSessionTimerState(): SessionTimerState | null {
  return read<SessionTimerState | null>(KEYS.sessionTimer, null);
}

export function saveSessionTimerState(state: SessionTimerState): void {
  write(KEYS.sessionTimer, state);
}

export function clearSessionTimerState(): void {
  localStorage.removeItem(KEYS.sessionTimer);
}

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

const THEME_KEY = "eisenmate_theme";
const EXPORT_APP_ID = "eisenmate";
const EXPORT_VERSION = 1;

export interface ExportData {
  version: number;
  app: string;
  exportedAt: string;
  data: {
    todos: Todo[];
    sessions: Session[];
    settings: UserSettings;
    theme: "light" | "dark";
  };
}

export type ImportMode = "replace" | "merge";

export function exportAllData(): ExportData {
  const theme = (localStorage.getItem(THEME_KEY) as "light" | "dark") ?? "light";
  return {
    version: EXPORT_VERSION,
    app: EXPORT_APP_ID,
    exportedAt: new Date().toISOString(),
    data: {
      todos: getTodos(),
      sessions: getSessions(),
      settings: getSettings(),
      theme,
    },
  };
}

export function downloadJson(data: ExportData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `eisenmate-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function validateExportData(raw: unknown): raw is ExportData {
  if (typeof raw !== "object" || raw === null) return false;
  const obj = raw as Record<string, unknown>;
  if (obj.app !== EXPORT_APP_ID) return false;
  if (typeof obj.version !== "number" || obj.version < 1) return false;
  if (typeof obj.data !== "object" || obj.data === null) return false;
  const data = obj.data as Record<string, unknown>;
  if (!Array.isArray(data.todos)) return false;
  if (!Array.isArray(data.sessions)) return false;
  return !(typeof data.settings !== "object" || data.settings === null);

}

export function importAllData(
  exported: ExportData,
  mode: ImportMode,
): void {
  const { todos, sessions, settings, theme } = exported.data;

  if (mode === "replace") {
    saveTodos(todos);
    saveSessions(sessions);
    saveSettings(settings);
    if (theme) localStorage.setItem(THEME_KEY, theme);
  } else {
    // Merge mode
    const existingTodos = getTodos();
    const existingTodoIds = new Set(existingTodos.map((t) => t.id));
    const mergedTodos = [...existingTodos];
    for (const todo of todos) {
      if (existingTodoIds.has(todo.id)) {
        // Overwrite existing with imported version
        const idx = mergedTodos.findIndex((t) => t.id === todo.id);
        if (idx !== -1) mergedTodos[idx] = todo;
      } else {
        mergedTodos.push(todo);
      }
    }
    saveTodos(mergedTodos);

    const existingSessions = getSessions();
    const existingSessionIds = new Set(existingSessions.map((s) => s.id));
    const mergedSessions = [...existingSessions];
    for (const session of sessions) {
      if (existingSessionIds.has(session.id)) {
        const idx = mergedSessions.findIndex((s) => s.id === session.id);
        if (idx !== -1) mergedSessions[idx] = session;
      } else {
        mergedSessions.push(session);
      }
    }
    saveSessions(mergedSessions);

    // Settings and theme are always replaced in merge mode
    saveSettings(settings);
    if (theme) localStorage.setItem(THEME_KEY, theme);
  }
}

export function parseExportFile(jsonString: string): ExportData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error("storage.invalidJson");
  }
  if (!validateExportData(parsed)) {
    throw new Error("storage.invalidBackup");
  }
  return parsed;
}
