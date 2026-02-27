import { STORAGE_CHANGE_EVENT, type StorageChangeDetail, type SyncConfig, DEFAULT_SYNC_CONFIG } from "./sync-types";

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
  updatedAt: number;
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
  updatedAt: number;
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
  syncConfig: "eisenmate_sync_config",
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

/**
 * Dispatches a storage change event. Used to notify the sync engine of local changes.
 * @param key - The storage key that changed
 * @param source - "local" if changed by user action, "sync" if changed by sync engine
 */
function dispatchStorageChange(key: string, source: "local" | "sync" = "local"): void {
  const detail: StorageChangeDetail = { key, timestamp: Date.now(), source };
  window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail }));
}

export function generateId(): string {
  return crypto.randomUUID();
}

// ─── Todos ──────────────────────────────────────────────────────────────────

export function getTodos(): Todo[] {
  const todos = read<Todo[]>(KEYS.todos, []);
  return todos.map((t) => ({
    ...t,
    quadrant: t.quadrant ?? null,
    updatedAt: t.updatedAt ?? Date.now(),
  }));
}

export function saveTodos(todos: Todo[], source: "local" | "sync" = "local"): void {
  write(KEYS.todos, todos);
  dispatchStorageChange(KEYS.todos, source);
}

// ─── Settings ───────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: UserSettings = {
  pomodoroMinutes: 25,
  breakMinutes: 5,
  overtimeMaxMinutes: 90,
  overtimeChimeIntervalMinutes: 5,
  allowEarlyFinish: true,
  silentMode: false,
  sessionTimerEnabled: true,
  updatedAt: 0,
};

export function getSettings(): UserSettings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<UserSettings>>(KEYS.settings, {}) };
}

export function saveSettings(settings: UserSettings, source: "local" | "sync" = "local"): void {
  write(KEYS.settings, settings);
  dispatchStorageChange(KEYS.settings, source);
}

// ─── Sessions ───────────────────────────────────────────────────────────────

export function getSessions(): Session[] {
  return read<Session[]>(KEYS.sessions, []);
}

export function saveSessions(sessions: Session[], source: "local" | "sync" = "local"): void {
  write(KEYS.sessions, sessions);
  dispatchStorageChange(KEYS.sessions, source);
}

// ─── Timer (not synced) ─────────────────────────────────────────────────────

export function getTimerState(): TimerState | null {
  return read<TimerState | null>(KEYS.timer, null);
}

export function saveTimerState(state: TimerState): void {
  write(KEYS.timer, state);
}

export function clearTimerState(): void {
  localStorage.removeItem(KEYS.timer);
}

// ─── Session Timer (not synced) ─────────────────────────────────────────────

export function getSessionTimerState(): SessionTimerState | null {
  return read<SessionTimerState | null>(KEYS.sessionTimer, null);
}

export function saveSessionTimerState(state: SessionTimerState): void {
  write(KEYS.sessionTimer, state);
}

export function clearSessionTimerState(): void {
  localStorage.removeItem(KEYS.sessionTimer);
}

// ─── Sync Config ────────────────────────────────────────────────────────────

export function getSyncConfig(): SyncConfig {
  return { ...DEFAULT_SYNC_CONFIG, ...read<Partial<SyncConfig>>(KEYS.syncConfig, {}) };
}

export function saveSyncConfig(config: SyncConfig): void {
  write(KEYS.syncConfig, config);
}

export function clearSyncConfig(): void {
  saveSyncConfig(DEFAULT_SYNC_CONFIG);
}

// ─── Storage Keys Export (for sync engine) ──────────────────────────────────

export { KEYS as STORAGE_KEYS };
