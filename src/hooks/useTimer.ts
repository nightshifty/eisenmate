import { useState, useRef, useCallback, useEffect } from "react";

export type TimerStatus = "idle" | "running" | "paused" | "completed";

export function useTimer(defaultMinutes: number) {
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [remainingMs, setRemainingMs] = useState(defaultMinutes * 60 * 1000);
  const endTimeRef = useRef<number | null>(null);
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
    endTimeRef.current = Date.now() + remainingMs;
    setStatus("running");
    intervalRef.current = window.setInterval(tick, 250);
  }, [remainingMs, tick, status]);

  const pause = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus("paused");
  }, []);

  const reset = useCallback(
    (minutes?: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRemainingMs((minutes ?? defaultMinutes) * 60 * 1000);
      setStatus("idle");
      endTimeRef.current = null;
    },
    [defaultMinutes],
  );

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const totalMs = defaultMinutes * 60 * 1000;
  const progress = totalMs > 0 ? ((totalMs - remainingMs) / totalMs) * 100 : 0;
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  return { status, minutes, seconds, remainingMs, progress, start, pause, reset };
}
