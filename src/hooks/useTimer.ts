import { useState, useRef, useCallback, useEffect } from "react";
import { getTimerState, saveTimerState, clearTimerState } from "@/lib/storage";

export type TimerStatus = "idle" | "running" | "paused" | "completed";

export function useTimer(defaultMinutes: number, activeTodoId: string | null = null) {
  // Refs for latest values — avoids stale closures in callbacks
  const activeTodoIdRef = useRef(activeTodoId);
  activeTodoIdRef.current = activeTodoId;
  const defaultMinutesRef = useRef(defaultMinutes);
  defaultMinutesRef.current = defaultMinutes;

  // Read saved state once (lazy initializer only runs on first render)
  const [restored] = useState(() => getTimerState());

  const [status, setStatus] = useState<TimerStatus>(() => {
    if (!restored) return "idle";
    if (restored.status === "running" && restored.endTime != null) {
      return restored.endTime - Date.now() > 0 ? "running" : "completed";
    }
    if (restored.status === "paused") return "paused";
    return "idle";
  });

  const [remainingMs, setRemainingMs] = useState(() => {
    if (!restored) return defaultMinutes * 60 * 1000;
    if (restored.status === "running" && restored.endTime != null) {
      const r = restored.endTime - Date.now();
      return r > 0 ? r : 0;
    }
    if (restored.status === "paused" && restored.remainingMs != null) {
      return restored.remainingMs;
    }
    return defaultMinutes * 60 * 1000;
  });

  const endTimeRef = useRef<number | null>(
    restored?.status === "running" && restored?.endTime != null && restored.endTime - Date.now() > 0
      ? restored.endTime
      : null,
  );
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === "idle") {
      setRemainingMs(defaultMinutes * 60 * 1000);
    }
  }, [defaultMinutes, status]);

  const tick = useCallback(() => {
    if (endTimeRef.current === null) return;
    const remaining = endTimeRef.current - Date.now();
    if (remaining <= 0) {
      setRemainingMs(0);
      setStatus("completed");
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimerState();
      new Audio(import.meta.env.BASE_URL + "beep_beep.mp3").play().catch(() => {});
      if (Notification.permission === "granted") {
        new Notification("Pomodoro fertig!", { body: "Zeit für eine Pause." });
      }
    } else {
      setRemainingMs(remaining);
    }
  }, []);

  const start = useCallback(() => {
    if (status === "completed") return;
    const endTime = Date.now() + remainingMs;
    endTimeRef.current = endTime;
    setStatus("running");
    intervalRef.current = window.setInterval(tick, 250);
    saveTimerState({
      status: "running",
      endTime,
      pomodoroMinutes: defaultMinutesRef.current,
      activeTodoId: activeTodoIdRef.current,
    });
  }, [remainingMs, tick, status]);

  const pause = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const currentRemaining = endTimeRef.current != null
      ? Math.max(0, endTimeRef.current - Date.now())
      : 0;
    endTimeRef.current = null;
    setRemainingMs(currentRemaining);
    setStatus("paused");
    saveTimerState({
      status: "paused",
      remainingMs: currentRemaining,
      pomodoroMinutes: defaultMinutesRef.current,
      activeTodoId: activeTodoIdRef.current,
    });
  }, []);

  const reset = useCallback(
    (minutes?: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRemainingMs((minutes ?? defaultMinutes) * 60 * 1000);
      setStatus("idle");
      endTimeRef.current = null;
      clearTimerState();
    },
    [defaultMinutes],
  );

  // Auto-start interval on mount if restored as running, or handle expired timer
  useEffect(() => {
    if (restored?.status === "running" && restored?.endTime != null) {
      if (restored.endTime - Date.now() > 0) {
        intervalRef.current = window.setInterval(tick, 250);
      } else {
        clearTimerState();
        new Audio(import.meta.env.BASE_URL + "beep_beep.mp3").play().catch(() => {});
        if (Notification.permission === "granted") {
          new Notification("Pomodoro fertig!", { body: "Zeit für eine Pause." });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Update persisted activeTodoId when it changes while timer is active
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (status === "running" && endTimeRef.current != null) {
      saveTimerState({
        status: "running",
        endTime: endTimeRef.current,
        pomodoroMinutes: defaultMinutesRef.current,
        activeTodoId,
      });
    } else if (status === "paused") {
      saveTimerState({
        status: "paused",
        remainingMs,
        pomodoroMinutes: defaultMinutesRef.current,
        activeTodoId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTodoId]);

  const totalMs = defaultMinutes * 60 * 1000;
  const progress = totalMs > 0 ? ((totalMs - remainingMs) / totalMs) * 100 : 0;
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  return { status, minutes, seconds, remainingMs, progress, start, pause, reset };
}
