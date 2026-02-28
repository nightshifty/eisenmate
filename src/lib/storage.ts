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
  updatedAt: string;
}

export interface Session {
  id: string;
  todoId: string | null;
  todoContent: string;
  durationMinutes: number;
  completedAt: string;
  updatedAt: string;
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
  lastSyncedAt: "eisenmate_last_synced_at",
  googleToken: "eisenmate_google_token",
  deletedTodoIds: "eisenmate_deleted_todo_ids",
  deletedSessionIds: "eisenmate_deleted_session_ids",
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
    updatedAt: t.updatedAt ?? t.completedAt ?? t.createdAt,
  }));
}

export function saveTodos(todos: Todo[]): void {
  write(KEYS.todos, todos);
  dispatchDataChanged();
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
  dispatchDataChanged();
}

export function getSessions(): Session[] {
  const sessions = read<Session[]>(KEYS.sessions, []);
  return sessions.map((s) => ({
    ...s,
    updatedAt: s.updatedAt ?? s.completedAt,
  }));
}

export function saveSessions(sessions: Session[]): void {
  write(KEYS.sessions, sessions);
  dispatchDataChanged();
}

export function getTimerState(): TimerState | null {
  return read<TimerState | null>(KEYS.timer, null);
}

export function saveTimerState(state: TimerState): void {
  write(KEYS.timer, state);
  dispatchDataChanged();
}

export function clearTimerState(): void {
  localStorage.removeItem(KEYS.timer);
  dispatchDataChanged();
}

export function getSessionTimerState(): SessionTimerState | null {
  return read<SessionTimerState | null>(KEYS.sessionTimer, null);
}

export function saveSessionTimerState(state: SessionTimerState): void {
  write(KEYS.sessionTimer, state);
  dispatchDataChanged();
}

export function clearSessionTimerState(): void {
  localStorage.removeItem(KEYS.sessionTimer);
  dispatchDataChanged();
}

// ---------------------------------------------------------------------------
// Deletion tombstones (for sync — tracks deleted IDs so other devices can remove them)
// ---------------------------------------------------------------------------

export interface Tombstone {
  id: string;
  deletedAt: string; // ISO timestamp
}

export function getDeletedTodoIds(): Tombstone[] {
  return read<Tombstone[]>(KEYS.deletedTodoIds, []);
}

export function getDeletedSessionIds(): Tombstone[] {
  return read<Tombstone[]>(KEYS.deletedSessionIds, []);
}

export function addDeletedTodoId(id: string): void {
  const existing = getDeletedTodoIds();
  if (!existing.some((t) => t.id === id)) {
    write(KEYS.deletedTodoIds, [...existing, { id, deletedAt: new Date().toISOString() }]);
  }
}

export function addDeletedSessionId(id: string): void {
  const existing = getDeletedSessionIds();
  if (!existing.some((t) => t.id === id)) {
    write(KEYS.deletedSessionIds, [...existing, { id, deletedAt: new Date().toISOString() }]);
  }
}

/** Remove tombstones older than the given age (default 30 days). */
export function pruneOldTombstones(maxAgeMs = 30 * 24 * 60 * 60 * 1000): void {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  const todos = getDeletedTodoIds().filter((t) => t.deletedAt > cutoff);
  write(KEYS.deletedTodoIds, todos);
  const sessions = getDeletedSessionIds().filter((t) => t.deletedAt > cutoff);
  write(KEYS.deletedSessionIds, sessions);
}

// ---------------------------------------------------------------------------
// Sync metadata
// ---------------------------------------------------------------------------

export function getLastSyncedAt(): string | null {
  return localStorage.getItem(KEYS.lastSyncedAt);
}

export function setLastSyncedAt(iso: string): void {
  localStorage.setItem(KEYS.lastSyncedAt, iso);
}

export interface GoogleTokenData {
  accessToken: string;
  expiresAt: number; // Date.now() + expires_in * 1000
  email: string;
}

export function getGoogleToken(): GoogleTokenData | null {
  return read<GoogleTokenData | null>(KEYS.googleToken, null);
}

export function saveGoogleToken(token: GoogleTokenData): void {
  write(KEYS.googleToken, token);
}

export function clearGoogleToken(): void {
  localStorage.removeItem(KEYS.googleToken);
}

/** Dispatch a custom event so hooks can refresh state after sync. */
export function dispatchSyncComplete(): void {
  window.dispatchEvent(new CustomEvent("eisenmate-sync-complete"));
}

/**
 * Guard to suppress data-changed events during sync import.
 * Prevents sync → import → dataChanged → sync loop.
 */
let _suppressDataChanged = false;

export function suppressDataChangedEvents(fn: () => void): void {
  _suppressDataChanged = true;
  try {
    fn();
  } finally {
    _suppressDataChanged = false;
  }
}

/** Dispatch a custom event when data is mutated (triggers auto-sync). */
export function dispatchDataChanged(): void {
  if (_suppressDataChanged) return;
  window.dispatchEvent(new CustomEvent("eisenmate-data-changed"));
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
    /** Tombstones for deleted items (sync only — optional for backward compat) */
    deletedTodoIds?: Tombstone[];
    deletedSessionIds?: Tombstone[];
    /** Timer state (sync only — optional for backward compat) */
    timerState?: TimerState | null;
    sessionTimerState?: SessionTimerState | null;
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
      deletedTodoIds: getDeletedTodoIds(),
      deletedSessionIds: getDeletedSessionIds(),
      timerState: getTimerState(),
      sessionTimerState: getSessionTimerState(),
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
    // Merge mode — last-write-wins based on updatedAt + tombstone support

    // 1. Merge tombstones from both sides
    const remoteDeletedTodoIds = exported.data.deletedTodoIds ?? [];
    const remoteDeletedSessionIds = exported.data.deletedSessionIds ?? [];
    const localDeletedTodoIds = getDeletedTodoIds();
    const localDeletedSessionIds = getDeletedSessionIds();

    // Combine tombstones (union by id)
    const allDeletedTodoIdSet = new Set([
      ...localDeletedTodoIds.map((t) => t.id),
      ...remoteDeletedTodoIds.map((t) => t.id),
    ]);
    const allDeletedSessionIdSet = new Set([
      ...localDeletedSessionIds.map((t) => t.id),
      ...remoteDeletedSessionIds.map((t) => t.id),
    ]);

    // Persist merged tombstones
    const mergedTodoTombstones = [
      ...localDeletedTodoIds,
      ...remoteDeletedTodoIds.filter((t) => !localDeletedTodoIds.some((l) => l.id === t.id)),
    ];
    write(KEYS.deletedTodoIds, mergedTodoTombstones);

    const mergedSessionTombstones = [
      ...localDeletedSessionIds,
      ...remoteDeletedSessionIds.filter((t) => !localDeletedSessionIds.some((l) => l.id === t.id)),
    ];
    write(KEYS.deletedSessionIds, mergedSessionTombstones);

    // 2. Merge todos (excluding tombstoned items)
    const existingTodos = getTodos();
    const existingTodoMap = new Map(existingTodos.map((t) => [t.id, t]));
    const mergedTodoMap = new Map(existingTodoMap);
    for (const todo of todos) {
      const existing = mergedTodoMap.get(todo.id);
      if (!existing || todo.updatedAt >= existing.updatedAt) {
        mergedTodoMap.set(todo.id, todo);
      }
    }
    // Remove tombstoned entries
    for (const id of allDeletedTodoIdSet) {
      mergedTodoMap.delete(id);
    }
    saveTodos([...mergedTodoMap.values()]);

    // 3. Merge sessions (excluding tombstoned items)
    const existingSessions = getSessions();
    const existingSessionMap = new Map(existingSessions.map((s) => [s.id, s]));
    const mergedSessionMap = new Map(existingSessionMap);
    for (const session of sessions) {
      const existing = mergedSessionMap.get(session.id);
      if (!existing || session.updatedAt >= existing.updatedAt) {
        mergedSessionMap.set(session.id, session);
      }
    }
    // Remove tombstoned entries
    for (const id of allDeletedSessionIdSet) {
      mergedSessionMap.delete(id);
    }
    saveSessions([...mergedSessionMap.values()]);

    // 4. Settings and theme are always replaced in merge mode
    saveSettings(settings);
    if (theme) localStorage.setItem(THEME_KEY, theme);

    // 5. Merge timer state — remote wins if local has no active timer
    const remoteTimer = exported.data.timerState ?? null;
    const localTimer = getTimerState();
    if (remoteTimer && !localTimer) {
      saveTimerState(remoteTimer);
    }

    // 6. Merge session timer state — remote wins if local has no active session
    const remoteSessionTimer = exported.data.sessionTimerState ?? null;
    const localSessionTimer = getSessionTimerState();
    if (remoteSessionTimer && !localSessionTimer) {
      saveSessionTimerState(remoteSessionTimer);
    }
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
