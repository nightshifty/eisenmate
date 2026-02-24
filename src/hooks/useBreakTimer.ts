import { useState, useRef, useCallback, useEffect } from "react";
import { playCompletionChime } from "@/lib/chime";

export type BreakStatus = "idle" | "running" | "overtime" | "completed";

const STORAGE_KEY = "eisenmate_break";

interface BreakTimerState {
  status: "running";
  endTime: number;
  breakMinutes: number;
}

function readBreakState(): BreakTimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    return JSON.parse(raw) as BreakTimerState;
  } catch {
    return null;
  }
}

function saveBreakState(state: BreakTimerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearBreakState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

interface UseBreakTimerOptions {
  defaultMinutes: number;
  overtimeMaxMinutes?: number;
  overtimeChimeIntervalMinutes?: number;
}

export function useBreakTimer({
  defaultMinutes,
  overtimeMaxMinutes = 90,
  overtimeChimeIntervalMinutes = 5,
}: UseBreakTimerOptions) {
  const defaultMinutesRef = useRef(defaultMinutes);
  defaultMinutesRef.current = defaultMinutes;
  const overtimeMaxMsRef = useRef(overtimeMaxMinutes * 60 * 1000);
  overtimeMaxMsRef.current = overtimeMaxMinutes * 60 * 1000;
  const overtimeChimeMsRef = useRef(overtimeChimeIntervalMinutes * 60 * 1000);
  overtimeChimeMsRef.current = overtimeChimeIntervalMinutes * 60 * 1000;

  const [restored] = useState(() => readBreakState());

  const [status, setStatus] = useState<BreakStatus>(() => {
    if (!restored) return "idle";
    if (restored.status === "running" && restored.endTime != null) {
      const remaining = restored.endTime - Date.now();
      if (remaining > 0) return "running";
      const overtimeElapsed = -remaining;
      if (overtimeElapsed < overtimeMaxMinutes * 60 * 1000) return "overtime";
      return "completed";
    }
    return "idle";
  });

  const [remainingMs, setRemainingMs] = useState(() => {
    if (!restored) return defaultMinutes * 60 * 1000;
    if (restored.status === "running" && restored.endTime != null) {
      return restored.endTime - Date.now();
    }
    return defaultMinutes * 60 * 1000;
  });

  const endTimeRef = useRef<number | null>(
    restored?.status === "running" && restored?.endTime != null
      ? restored.endTime
      : null,
  );
  const intervalRef = useRef<number | null>(null);
  const lastChimeAtMsRef = useRef<number | null>(null);
  const completionFiredRef = useRef(false);

  // On restore: if already in overtime, mark completion as already fired
  useEffect(() => {
    if (status === "overtime") {
      completionFiredRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset remainingMs when defaultMinutes changes while idle
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
      const overtimeElapsed = -remaining;

      // First time crossing zero
      if (!completionFiredRef.current) {
        completionFiredRef.current = true;
        lastChimeAtMsRef.current = 0;
        setStatus("overtime");
        playCompletionChime();
        if (Notification.permission === "granted") {
          new Notification("Pause vorbei!", { body: "Overtime läuft — zurück an die Arbeit." });
        }
        return;
      }

      // Check overtime limit
      if (overtimeElapsed >= overtimeMaxMsRef.current) {
        setStatus("completed");
        if (intervalRef.current) clearInterval(intervalRef.current);
        clearBreakState();
        playCompletionChime();
        if (Notification.permission === "granted") {
          new Notification("Pausen-Overtime beendet!", { body: "Maximale Overtime erreicht." });
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
    if (status !== "idle") return;
    const endTime = Date.now() + remainingMs;
    endTimeRef.current = endTime;
    setStatus("running");
    intervalRef.current = window.setInterval(tick, 250);
    saveBreakState({
      status: "running",
      endTime,
      breakMinutes: defaultMinutesRef.current,
    });
  }, [remainingMs, tick, status]);

  const skip = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRemainingMs(defaultMinutesRef.current * 60 * 1000);
    setStatus("idle");
    endTimeRef.current = null;
    completionFiredRef.current = false;
    lastChimeAtMsRef.current = null;
    clearBreakState();
  }, []);

  // Auto-start interval on mount if restored as running/overtime
  useEffect(() => {
    if (restored?.status === "running" && restored?.endTime != null) {
      const remaining = restored.endTime - Date.now();
      if (remaining > 0 || (remaining <= 0 && -remaining < overtimeMaxMinutes * 60 * 1000)) {
        intervalRef.current = window.setInterval(tick, 250);
        if (remaining <= 0) {
          completionFiredRef.current = true;
        }
      } else {
        clearBreakState();
        playCompletionChime();
        if (Notification.permission === "granted") {
          new Notification("Pausen-Overtime beendet!", { body: "Maximale Overtime erreicht." });
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

  const totalMs = defaultMinutes * 60 * 1000;
  const progress = totalMs > 0 ? Math.min(100, ((totalMs - remainingMs) / totalMs) * 100) : 0;

  const isOvertime = remainingMs < 0;
  const absMs = Math.abs(remainingMs);
  const displayMinutes = Math.floor(absMs / 60000);
  const displaySeconds = Math.floor((absMs % 60000) / 1000);

  return {
    status,
    minutes: displayMinutes,
    seconds: displaySeconds,
    isOvertime,
    remainingMs,
    progress,
    start,
    skip,
  };
}
