import { useState, useRef, useCallback, useEffect } from "react";
import { getTimerState, saveTimerState, clearTimerState } from "@/lib/storage";
import { playCompletionChime } from "@/lib/chime";

export type TimerStatus = "idle" | "running" | "paused" | "overtime" | "completed";

interface UseTimerOptions {
  defaultMinutes: number;
  activeTodoId?: string | null;
  overtimeMaxMinutes?: number;
  overtimeChimeIntervalMinutes?: number;
}

export function useTimer({
  defaultMinutes,
  activeTodoId = null,
  overtimeMaxMinutes = 90,
  overtimeChimeIntervalMinutes = 5,
}: UseTimerOptions) {
  // Refs for latest values — avoids stale closures in callbacks
  const activeTodoIdRef = useRef(activeTodoId);
  activeTodoIdRef.current = activeTodoId;
  const defaultMinutesRef = useRef(defaultMinutes);
  defaultMinutesRef.current = defaultMinutes;
  const overtimeMaxMsRef = useRef(overtimeMaxMinutes * 60 * 1000);
  overtimeMaxMsRef.current = overtimeMaxMinutes * 60 * 1000;
  const overtimeChimeMsRef = useRef(overtimeChimeIntervalMinutes * 60 * 1000);
  overtimeChimeMsRef.current = overtimeChimeIntervalMinutes * 60 * 1000;

  // Read saved state once (lazy initializer only runs on first render)
  const [restored] = useState(() => getTimerState());

  const [status, setStatus] = useState<TimerStatus>(() => {
    if (!restored) return "idle";
    if (restored.status === "running" && restored.endTime != null) {
      const remaining = restored.endTime - Date.now();
      if (remaining > 0) return "running";
      // Timer expired while away — check if within overtime limit
      const overtimeElapsed = -remaining;
      if (overtimeElapsed < overtimeMaxMinutes * 60 * 1000) return "overtime";
      return "completed";
    }
    if (restored.status === "paused") return "paused";
    return "idle";
  });

  const [remainingMs, setRemainingMs] = useState(() => {
    if (!restored) return defaultMinutes * 60 * 1000;
    if (restored.status === "running" && restored.endTime != null) {
      return restored.endTime - Date.now(); // can be negative (overtime)
    }
    if (restored.status === "paused" && restored.remainingMs != null) {
      return restored.remainingMs;
    }
    return defaultMinutes * 60 * 1000;
  });

  const endTimeRef = useRef<number | null>(
    restored?.status === "running" && restored?.endTime != null
      ? restored.endTime
      : null,
  );
  const intervalRef = useRef<number | null>(null);

  // Track the last chime time to know when to play the next periodic chime
  const lastChimeAtMsRef = useRef<number | null>(null);
  // Track whether the initial completion (0-crossing) has been handled
  const completionFiredRef = useRef(false);

  // On restore: if already in overtime, mark completion as already fired
  useEffect(() => {
    if (status === "overtime") {
      completionFiredRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === "idle") {
      setRemainingMs(defaultMinutes * 60 * 1000);
      completionFiredRef.current = false;
      lastChimeAtMsRef.current = null;
    }
  }, [defaultMinutes, status]);

  const tick = useCallback(() => {
    if (endTimeRef.current === null) return;
    const remaining = endTimeRef.current - Date.now();
    setRemainingMs(remaining);

    if (remaining <= 0) {
      const overtimeElapsed = -remaining; // positive ms of overtime

      // First time crossing zero
      if (!completionFiredRef.current) {
        completionFiredRef.current = true;
        lastChimeAtMsRef.current = 0;
        setStatus("overtime");
        playCompletionChime();
        if (Notification.permission === "granted") {
          new Notification("Pomodoro fertig!", { body: "Overtime läuft — Zeit für eine Pause." });
        }
        return;
      }

      // Check overtime limit
      if (overtimeElapsed >= overtimeMaxMsRef.current) {
        setStatus("completed");
        if (intervalRef.current) clearInterval(intervalRef.current);
        clearTimerState();
        playCompletionChime();
        if (Notification.permission === "granted") {
          new Notification("Overtime beendet!", { body: "Maximale Overtime erreicht." });
        }
        return;
      }

      // Periodic chime
      const lastChime = lastChimeAtMsRef.current ?? 0;
      if (overtimeChimeMsRef.current > 0 && overtimeElapsed - lastChime >= overtimeChimeMsRef.current) {
        lastChimeAtMsRef.current = overtimeElapsed;
        playCompletionChime();
      }
    }
  }, []);

  const start = useCallback(() => {
    if (status === "completed" || status === "overtime") return;
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
    if (status === "overtime") return; // no pause in overtime
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
  }, [status]);

  const reset = useCallback(
    (minutes?: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRemainingMs((minutes ?? defaultMinutes) * 60 * 1000);
      setStatus("idle");
      endTimeRef.current = null;
      completionFiredRef.current = false;
      lastChimeAtMsRef.current = null;
      clearTimerState();
    },
    [defaultMinutes],
  );

  // Auto-start interval on mount if restored as running/overtime, or handle expired timer
  useEffect(() => {
    if (restored?.status === "running" && restored?.endTime != null) {
      const remaining = restored.endTime - Date.now();
      if (remaining > 0 || (remaining <= 0 && -remaining < overtimeMaxMinutes * 60 * 1000)) {
        // Still running or within overtime — start interval
        intervalRef.current = window.setInterval(tick, 250);
        if (remaining <= 0) {
          // Already in overtime on mount
          completionFiredRef.current = true;
        }
      } else {
        // Exceeded overtime limit while away
        clearTimerState();
        playCompletionChime();
        if (Notification.permission === "granted") {
          new Notification("Overtime beendet!", { body: "Maximale Overtime erreicht." });
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
    if ((status === "running" || status === "overtime") && endTimeRef.current != null) {
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
  const progress = totalMs > 0 ? Math.min(100, ((totalMs - remainingMs) / totalMs) * 100) : 0;

  // For display: if overtime, show negative time
  const isOvertime = remainingMs < 0;
  const absMs = Math.abs(remainingMs);
  const displayMinutes = Math.floor(absMs / 60000);
  const displaySeconds = Math.floor((absMs % 60000) / 1000);

  // How much overtime has elapsed (0 if not in overtime)
  const overtimeMs = remainingMs < 0 ? -remainingMs : 0;

  return {
    status,
    minutes: displayMinutes,
    seconds: displaySeconds,
    isOvertime,
    overtimeMs,
    remainingMs,
    progress,
    start,
    pause,
    reset,
  };
}
