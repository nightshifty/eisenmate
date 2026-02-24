import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { TimerCircle } from "./TimerCircle";
import { useTimer } from "@/hooks/useTimer";
import { Play, Pause, RotateCcw, Square } from "lucide-react";
import type { Todo } from "@/hooks/useTodos";
import type { TimerStatus } from "@/hooks/useTimer";

interface PomodoroTimerProps {
  pomodoroMinutes: number;
  overtimeMaxMinutes: number;
  overtimeChimeIntervalMinutes: number;
  activeTodo: Todo | null;
  onPomodoroComplete: () => void;
  onOvertimeStop: (overtimeMinutes: number) => void;
  onStatusChange?: (status: TimerStatus) => void;
}

export function PomodoroTimer({
  pomodoroMinutes,
  overtimeMaxMinutes,
  overtimeChimeIntervalMinutes,
  activeTodo,
  onPomodoroComplete,
  onOvertimeStop,
  onStatusChange,
}: PomodoroTimerProps) {
  const { status, minutes, seconds, progress, isOvertime, overtimeMs, start, pause, reset } = useTimer({
    defaultMinutes: pomodoroMinutes,
    activeTodoId: activeTodo?.id ?? null,
    overtimeMaxMinutes,
    overtimeChimeIntervalMinutes,
  });

  const onCompleteRef = useRef(onPomodoroComplete);
  const onOvertimeStopRef = useRef(onOvertimeStop);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onCompleteRef.current = onPomodoroComplete;
    onOvertimeStopRef.current = onOvertimeStop;
    onStatusChangeRef.current = onStatusChange;
  });

  // Track previous status to detect transitions
  const prevStatusRef = useRef(status);

  useEffect(() => {
    onStatusChangeRef.current?.(status);

    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    // Transition into overtime → fire pomodoro complete (books pomodoro duration)
    if (status === "overtime" && prev !== "overtime") {
      onCompleteRef.current();
    }

    // Transition into completed from overtime → auto-stop overtime (books overtime duration)
    if (status === "completed" && prev === "overtime") {
      const overtimeMinutes = Math.floor(overtimeMs / 60000);
      if (overtimeMinutes > 0) {
        onOvertimeStopRef.current(overtimeMinutes);
      }
    }
  }, [status, overtimeMs]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleReset = () => {
    // If resetting from overtime, book the overtime duration first
    if (status === "overtime" || status === "completed") {
      const overtimeMinutes = Math.floor(overtimeMs / 60000);
      if (overtimeMinutes > 0 && status === "overtime") {
        onOvertimeStopRef.current(overtimeMinutes);
      }
    }
    reset();
  };

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6">
      <TimerCircle progress={progress} minutes={minutes} seconds={seconds} isOvertime={isOvertime} />

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
        ) : status === "overtime" ? (
          <Button onClick={handleReset} size="lg" variant="destructive" className="gap-2">
            <Square className="h-5 w-5" />
            Stoppen
          </Button>
        ) : null}

        {(status === "running" || status === "paused" || status === "completed") && (
          <Button onClick={handleReset} size="lg" variant="outline" className="gap-2">
            <RotateCcw className="h-5 w-5" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
