import { useState, useMemo, useCallback } from "react";
import { getSessions, saveSessions, generateId, type Session } from "@/lib/storage";

export type { Session } from "@/lib/storage";

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>(() => getSessions());

  const addSession = useCallback((session: Omit<Session, "id">) => {
    const updated = [{ ...session, id: generateId() }, ...getSessions()];
    saveSessions(updated);
    setSessions(updated);
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    const updated = getSessions().filter((s) => s.id !== sessionId);
    saveSessions(updated);
    setSessions(updated);
  }, []);

  const clearSessions = useCallback(() => {
    saveSessions([]);
    setSessions([]);
  }, []);

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

  return { sessions, todaySessions, todayMinutes, addSession, deleteSession, clearSessions };
}
