import { useState, useMemo, useCallback, useEffect } from "react";
import { getSessions, saveSessions, getTodos, saveTodos, generateId, addDeletedSessionId, type Session } from "@/lib/storage";

export type { Session } from "@/lib/storage";

/**
 * Subtracts session durations from the linked todos' timeSpentMinutes.
 * - Sessions with todoId === null are ignored.
 * - Todos that no longer exist are silently skipped.
 * - timeSpentMinutes is clamped to a minimum of 0.
 */
function subtractSessionTimesFromTodos(sessionsToRemove: Session[]): void {
  // Aggregate total minutes to subtract per todoId
  const minutesByTodoId = new Map<string, number>();
  for (const session of sessionsToRemove) {
    if (session.todoId === null) continue;
    minutesByTodoId.set(
      session.todoId,
      (minutesByTodoId.get(session.todoId) ?? 0) + session.durationMinutes,
    );
  }

  if (minutesByTodoId.size === 0) return;

  const todos = getTodos();
  let changed = false;
  const updated = todos.map((t) => {
    const minutesToSubtract = minutesByTodoId.get(t.id);
    if (minutesToSubtract === undefined) return t;
    changed = true;
    return { ...t, timeSpentMinutes: Math.max(0, t.timeSpentMinutes - minutesToSubtract) };
  });

  if (changed) {
    saveTodos(updated);
  }
}

export function useSessions(onTodosChanged?: () => void) {
  const [sessions, setSessions] = useState<Session[]>(() => getSessions());

  const addSession = useCallback((session: Omit<Session, "id" | "updatedAt">) => {
    const now = new Date().toISOString();
    const updated = [{ ...session, id: generateId(), updatedAt: now }, ...getSessions()];
    saveSessions(updated);
    setSessions(updated);
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    const allSessions = getSessions();
    const sessionToDelete = allSessions.find((s) => s.id === sessionId);

    if (sessionToDelete) {
      subtractSessionTimesFromTodos([sessionToDelete]);
      onTodosChanged?.();
    }

    addDeletedSessionId(sessionId);
    const updated = allSessions.filter((s) => s.id !== sessionId);
    saveSessions(updated);
    setSessions(updated);
  }, [onTodosChanged]);

  const clearSessions = useCallback(() => {
    const allSessions = getSessions();

    if (allSessions.length > 0) {
      subtractSessionTimesFromTodos(allSessions);
      onTodosChanged?.();
      // Record tombstones for all deleted sessions
      for (const session of allSessions) {
        addDeletedSessionId(session.id);
      }
    }

    saveSessions([]);
    setSessions([]);
  }, [onTodosChanged]);

  const { todaySessions, todayMinutes } = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayItems = sessions.filter(
      (s) => new Date(s.completedAt) >= todayStart,
    );
    return {
      todaySessions: todayItems.length,
      todayMinutes: todayItems.reduce((sum, s) => sum + s.durationMinutes, 0),
    };
  }, [sessions]);

  const refreshSessions = useCallback(() => {
    setSessions(getSessions());
  }, []);

  // Auto-refresh when sync completes
  useEffect(() => {
    const handler = () => refreshSessions();
    window.addEventListener("eisenmate-sync-complete", handler);
    return () => window.removeEventListener("eisenmate-sync-complete", handler);
  }, [refreshSessions]);

  return { sessions, todaySessions, todayMinutes, addSession, deleteSession, clearSessions, refreshSessions };
}
