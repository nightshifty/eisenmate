import { useState, useCallback, useEffect, useRef } from "react";
import {
  getSessionTimerState,
  saveSessionTimerState,
  clearSessionTimerState,
  type SessionTimerState,
} from "@/lib/storage";

export interface SessionSummary {
  totalMinutes: number;
  pomodoroCount: number;
  focusMinutes: number;
  productivityPercent: number;
  longestPomodoroMinutes: number;
  todoNames: string[];
}

export function useSessionTimer(enabled: boolean) {
  const [state, setState] = useState<SessionTimerState | null>(() =>
    enabled ? getSessionTimerState() : null,
  );
  const [elapsedMs, setElapsedMs] = useState(() => {
    if (!enabled) return 0;
    const saved = getSessionTimerState();
    return saved ? Date.now() - saved.startTime : 0;
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRunning = state !== null;

  // Tick interval to update the elapsed display every second
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (state) {
      const { startTime } = state;
      intervalRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTime);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state]);



  const start = useCallback(() => {
    if (!enabled) return;
    if (state) return; // already running
    const newState: SessionTimerState = {
      startTime: Date.now(),
      pomodoroCount: 0,
      focusMinutes: 0,
      longestPomodoroMinutes: 0,
      todoNames: [],
      sessionSessions: [],
    };
    saveSessionTimerState(newState);
    setState(newState);
  }, [enabled, state]);

  const recordPomodoro = useCallback(
    (durationMinutes: number, todoName: string | null) => {
      setState((prev) => {
        if (!prev) return prev;
        const names = todoName && !prev.todoNames.includes(todoName)
          ? [...prev.todoNames, todoName]
          : prev.todoNames;
        const next: SessionTimerState = {
          ...prev,
          pomodoroCount: prev.pomodoroCount + 1,
          focusMinutes: prev.focusMinutes + durationMinutes,
          longestPomodoroMinutes: Math.max(prev.longestPomodoroMinutes, durationMinutes),
          todoNames: names,
        };
        saveSessionTimerState(next);
        return next;
      });
    },
    [],
  );

  const buildSummary = useCallback((s: SessionTimerState): SessionSummary => {
    const totalMs = Date.now() - s.startTime;
    const totalMinutes = Math.round(totalMs / 60000);
    return {
      totalMinutes,
      pomodoroCount: s.pomodoroCount,
      focusMinutes: s.focusMinutes,
      productivityPercent:
        totalMinutes > 0
          ? Math.round((s.focusMinutes / totalMinutes) * 100)
          : 0,
      longestPomodoroMinutes: s.longestPomodoroMinutes,
      todoNames: s.todoNames,
    };
  }, []);

  const getSummary = useCallback((): SessionSummary | null => {
    if (!state) return null;
    return buildSummary(state);
  }, [state, buildSummary]);

  const stop = useCallback((): void => {
    clearSessionTimerState();
    setState(null);
    setElapsedMs(0);
  }, []);

  // Format elapsed time as HH:MM:SS
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const display = hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return {
    isRunning,
    elapsedMs,
    display,
    pomodoroCount: state?.pomodoroCount ?? 0,
    focusMinutes: state?.focusMinutes ?? 0,
    start,
    stop,
    getSummary,
    recordPomodoro,
  };
}
