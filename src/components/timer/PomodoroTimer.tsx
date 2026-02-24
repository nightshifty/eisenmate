import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { TimerCircle } from "./TimerCircle";
import { useTimer } from "@/hooks/useTimer";
import { Play, Pause, RotateCcw } from "lucide-react";
import type { Todo } from "@/hooks/useTodos";
import type { TimerStatus } from "@/hooks/useTimer";

interface PomodoroTimerProps {
  pomodoroMinutes: number;
  activeTodo: Todo | null;
  onPomodoroComplete: () => void;
  onStatusChange?: (status: TimerStatus) => void;
}

export function PomodoroTimer({ pomodoroMinutes, activeTodo, onPomodoroComplete, onStatusChange }: PomodoroTimerProps) {
  const { status, minutes, seconds, progress, start, pause, reset } = useTimer(pomodoroMinutes, activeTodo?.id ?? null);

  const onCompleteRef = useRef(onPomodoroComplete);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onCompleteRef.current = onPomodoroComplete;
    onStatusChangeRef.current = onStatusChange;
  });

  useEffect(() => {
    onStatusChangeRef.current?.(status);
    if (status === "completed") {
      onCompleteRef.current();
    }
  }, [status]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <TimerCircle progress={progress} minutes={minutes} seconds={seconds} />

      {activeTodo && (
        <p className="text-sm text-muted-foreground">
          Aktive Aufgabe: <span className="font-medium text-foreground">{activeTodo.content}</span>
        </p>
      )}
      {!activeTodo && (
        <p className="text-sm text-muted-foreground">Keine Aufgabe ausgewählt</p>
      )}

      <div className="flex gap-3">
        {status === "idle" || status === "paused" ? (
          <Button onClick={start} size="lg" className="gap-2">
            <Play className="h-5 w-5" />
            {status === "paused" ? "Fortsetzen" : "Start"}
          </Button>
        ) : status === "running" ? (
          <Button onClick={pause} size="lg" variant="secondary" className="gap-2">
            <Pause className="h-5 w-5" />
            Pause
          </Button>
        ) : null}

        {status !== "idle" && (
          <Button onClick={() => reset()} size="lg" variant="outline" className="gap-2">
            <RotateCcw className="h-5 w-5" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
