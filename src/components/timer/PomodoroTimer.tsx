import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TimerCircle } from "./TimerCircle";
import type { TimerVariant } from "./TimerCircle";
import { useTimer } from "@/hooks/useTimer";
import { useBreakTimer } from "@/hooks/useBreakTimer";
import { Play, Square, SkipForward, Coffee, Check, X } from "lucide-react";
import type { Todo } from "@/hooks/useTodos";
import type { TimerStatus } from "@/hooks/useTimer";

type Phase = "pomodoro" | "break";

interface PomodoroTimerProps {
  pomodoroMinutes: number;
  breakMinutes: number;
  overtimeMaxMinutes: number;
  overtimeChimeIntervalMinutes: number;
  allowEarlyFinish: boolean;
  activeTodo: Todo | null;
  onPomodoroComplete: () => void;
  onEarlyFinish: (elapsedMinutes: number) => void;
  onOvertimeStop: (overtimeMinutes: number) => void;
  onStatusChange?: (status: TimerStatus | "break") => void;
}

export function PomodoroTimer({
  pomodoroMinutes,
  breakMinutes,
  overtimeMaxMinutes,
  overtimeChimeIntervalMinutes,
  allowEarlyFinish,
  activeTodo,
  onPomodoroComplete,
  onEarlyFinish,
  onOvertimeStop,
  onStatusChange,
}: PomodoroTimerProps) {
  const [phase, setPhase] = useState<Phase>("pomodoro");

  const pomodoro = useTimer({
    defaultMinutes: pomodoroMinutes,
    activeTodoId: activeTodo?.id ?? null,
    overtimeMaxMinutes,
    overtimeChimeIntervalMinutes,
  });

  const breakTimer = useBreakTimer({
    defaultMinutes: breakMinutes,
    overtimeMaxMinutes,
    overtimeChimeIntervalMinutes,
  });

  const onCompleteRef = useRef(onPomodoroComplete);
  const onEarlyFinishRef = useRef(onEarlyFinish);
  const onOvertimeStopRef = useRef(onOvertimeStop);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onCompleteRef.current = onPomodoroComplete;
    onEarlyFinishRef.current = onEarlyFinish;
    onOvertimeStopRef.current = onOvertimeStop;
    onStatusChangeRef.current = onStatusChange;
  });

  // On mount: if break timer is active (restored), go to break phase
  useEffect(() => {
    if (breakTimer.status === "running" || breakTimer.status === "overtime") {
      setPhase("break");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Report status to parent
  useEffect(() => {
    if (phase === "break") {
      onStatusChangeRef.current?.("break");
    } else {
      onStatusChangeRef.current?.(pomodoro.status);
    }
  }, [phase, pomodoro.status]);

  // Track previous pomodoro status to detect transitions
  const prevPomodoroStatusRef = useRef(pomodoro.status);

  useEffect(() => {
    const prev = prevPomodoroStatusRef.current;
    prevPomodoroStatusRef.current = pomodoro.status;

    // Transition into overtime -> fire pomodoro complete (books pomodoro duration)
    if (pomodoro.status === "overtime" && prev !== "overtime") {
      onCompleteRef.current();
    }

    // Transition into completed from overtime -> auto-stop overtime, then start break
    if (pomodoro.status === "completed" && prev === "overtime") {
      const overtimeMinutes = Math.floor(pomodoro.overtimeMs / 60000);
      if (overtimeMinutes > 0) {
        onOvertimeStopRef.current(overtimeMinutes);
      }
      // Auto-transition to break
      pomodoro.reset();
      setPhase("break");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoro.status, pomodoro.overtimeMs, pomodoro.reset]);

  // Auto-start break timer when entering break phase
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (phase === "break" && prevPhaseRef.current !== "break") {
      // Only auto-start if break timer is idle (not restored mid-run)
      if (breakTimer.status === "idle") {
        breakTimer.start();
      }
    }
    prevPhaseRef.current = phase;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, breakTimer.status, breakTimer.start]);

  // When break completes (overtime max reached), go back to pomodoro
  const prevBreakStatusRef = useRef(breakTimer.status);
  useEffect(() => {
    const prev = prevBreakStatusRef.current;
    prevBreakStatusRef.current = breakTimer.status;

    if (breakTimer.status === "completed" && prev !== "completed") {
      breakTimer.skip();
      setPhase("pomodoro");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakTimer.status, breakTimer.skip]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handlePomodoroReset = () => {
    // If resetting from overtime, book the overtime duration first
    if (pomodoro.status === "overtime") {
      const overtimeMinutes = Math.floor(pomodoro.overtimeMs / 60000);
      if (overtimeMinutes > 0) {
        onOvertimeStopRef.current(overtimeMinutes);
      }
    }
    pomodoro.reset();
    // After manual stop in overtime, transition to break
    if (pomodoro.status === "overtime") {
      setPhase("break");
    }
  };

  const handleEarlyFinish = () => {
    // Calculate elapsed time in minutes (round down)
    const totalMs = pomodoroMinutes * 60 * 1000;
    const elapsedMs = totalMs - pomodoro.remainingMs;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    if (elapsedMinutes > 0) {
      onEarlyFinishRef.current(elapsedMinutes);
    }
    pomodoro.reset();
    setPhase("break");
  };

  const handleSkipBreak = () => {
    breakTimer.skip();
    setPhase("pomodoro");
  };

  // Determine what to show based on phase
  if (phase === "break") {
    const breakVariant: TimerVariant = breakTimer.isOvertime ? "overtime" : "break";

    return (
      <div className="flex flex-col items-center gap-4 sm:gap-6">
        <TimerCircle
          progress={breakTimer.progress}
          minutes={breakTimer.minutes}
          seconds={breakTimer.seconds}
          variant={breakVariant}
        />

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Coffee className="h-4 w-4 text-break" />
          <span>Pause</span>
        </div>

        <div className="flex gap-3">
          {breakTimer.isOvertime ? (
            <Button onClick={handleSkipBreak} size="lg" variant="destructive" className="gap-2">
              <Square className="h-5 w-5" />
              Stoppen
            </Button>
          ) : (
            <Button onClick={handleSkipBreak} size="lg" variant="outline" className="gap-2">
              <SkipForward className="h-5 w-5" />
              Überspringen
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Pomodoro phase
  const pomodoroVariant: TimerVariant = pomodoro.isOvertime ? "overtime" : "pomodoro";

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6">
      <TimerCircle
        progress={pomodoro.progress}
        minutes={pomodoro.minutes}
        seconds={pomodoro.seconds}
        variant={pomodoroVariant}
      />

      {activeTodo && (
        <p className="text-sm text-muted-foreground">
          Aktive Aufgabe: <span className="font-medium text-foreground">{activeTodo.content}</span>
        </p>
      )}
      {!activeTodo && (
        <p className="text-sm text-muted-foreground">Keine Aufgabe ausgewählt</p>
      )}

      <div className="flex gap-3">
        {pomodoro.status === "idle" || pomodoro.status === "paused" ? (
          <Button onClick={pomodoro.start} size="lg" className="gap-2">
            <Play className="h-5 w-5" />
            {pomodoro.status === "paused" ? "Fortsetzen" : "Start"}
          </Button>
        ) : pomodoro.status === "running" && allowEarlyFinish ? (
          <Button onClick={handleEarlyFinish} size="lg" variant="default" className="gap-2">
            <Check className="h-5 w-5" />
            Abschließen
          </Button>
        ) : pomodoro.status === "overtime" ? (
          <Button onClick={handlePomodoroReset} size="lg" variant="default" className="gap-2">
            <Check className="h-5 w-5" />
            Abschließen
          </Button>
        ) : null}

        {(pomodoro.status === "running" || pomodoro.status === "paused" || pomodoro.status === "completed") && (
          <Button onClick={() => pomodoro.reset()} size="lg" variant="outline" className="gap-2">
            <X className="h-5 w-5" />
            Abbrechen
          </Button>
        )}
      </div>
    </div>
  );
}
