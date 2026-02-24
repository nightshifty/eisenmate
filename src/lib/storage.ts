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
