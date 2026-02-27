import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TimerCircle } from "./TimerCircle";
import type { TimerVariant } from "./TimerCircle";
import { useTimer } from "@/hooks/useTimer";
import { useBreakTimer } from "@/hooks/useBreakTimer";
import { Play, Square, SkipForward, Coffee, Check, X, PartyPopper } from "lucide-react";
import type { Todo } from "@/hooks/useTodos";
import type { TimerStatus } from "@/hooks/useTimer";
import { fireConfetti } from "@/lib/confetti";
import { getTimerState } from "@/lib/storage";
import { useTranslation, Trans } from "react-i18next";

type Phase = "pomodoro" | "break";

interface PomodoroTimerProps {
  pomodoroMinutes: number;
  breakMinutes: number;
  overtimeMaxMinutes: number;
  overtimeChimeIntervalMinutes: number;
  allowEarlyFinish: boolean;
  silentMode?: boolean;
  activeTodo: Todo | null;
  onPomodoroComplete: (effectivePomodoroMinutes: number) => void;
  onEarlyFinish: (elapsedMinutes: number) => void;
  onOvertimeStop: (overtimeMinutes: number, effectivePomodoroMinutes: number) => void;
  onToggleDone: (todoId: string, done: boolean) => void;
  onStatusChange?: (status: TimerStatus | "break") => void;
  children: (timerDisplay: ReactNode, controls: ReactNode) => ReactNode;
}

export function PomodoroTimer({
  pomodoroMinutes,
  breakMinutes,
  overtimeMaxMinutes,
  overtimeChimeIntervalMinutes,
  allowEarlyFinish,
  silentMode,
  activeTodo,
  onPomodoroComplete,
  onEarlyFinish,
  onOvertimeStop,
  onToggleDone,
  onStatusChange,
  children,
}: PomodoroTimerProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("pomodoro");
  const [overrideMinutes, setOverrideMinutes] = useState<number | null>(() => {
    const saved = getTimerState();
    if (saved && saved.pomodoroMinutes !== pomodoroMinutes) {
      return saved.pomodoroMinutes;
    }
    return null;
  });

  // State for the "task completed?" confirmation dialog
  const [taskCompleteDialogOpen, setTaskCompleteDialogOpen] = useState(false);
  // Stores the pending finish action so we can execute it after the dialog decision
  const pendingFinishRef = useRef<(() => void) | null>(null);

  const effectiveMinutes = overrideMinutes ?? pomodoroMinutes;
  const effectiveMinutesRef = useRef(effectiveMinutes);
  effectiveMinutesRef.current = effectiveMinutes;

  const pomodoro = useTimer({
    defaultMinutes: effectiveMinutes,
    activeTodoId: activeTodo?.id ?? null,
    overtimeMaxMinutes,
    overtimeChimeIntervalMinutes,
    silentMode,
  });

  const breakTimer = useBreakTimer({
    defaultMinutes: breakMinutes,
    overtimeMaxMinutes,
    overtimeChimeIntervalMinutes,
    silentMode,
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
      onCompleteRef.current(effectiveMinutesRef.current);
    }

    // Transition into completed from overtime -> auto-stop overtime, then start break
    if (pomodoro.status === "completed" && prev === "overtime") {
      const overtimeMinutes = Math.floor(pomodoro.overtimeMs / 60000);
      onOvertimeStopRef.current(overtimeMinutes, effectiveMinutesRef.current);
      // Auto-transition to break
      pomodoro.reset();
      setOverrideMinutes(null);
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

  const finishPomodoro = () => {
    pomodoro.reset();
    setOverrideMinutes(null);
    setPhase("break");
  };

  const handlePomodoroReset = () => {
    // If resetting from overtime, book the overtime duration first
    if (pomodoro.status === "overtime") {
      const overtimeMinutes = Math.floor(pomodoro.overtimeMs / 60000);
      onOvertimeStopRef.current(overtimeMinutes, effectiveMinutesRef.current);
    }
    const wasOvertime = pomodoro.status === "overtime";

    if (wasOvertime) {
      // Always show dialog — it handles task completion + abort options
      pendingFinishRef.current = () => {
        pomodoro.reset();
        setOverrideMinutes(null);
        setPhase("break");
      };
      setTaskCompleteDialogOpen(true);
      return;
    }

    pomodoro.reset();
    setOverrideMinutes(null);
  };

  const handleEarlyFinish = () => {
    // Calculate elapsed time in minutes (round down)
    const totalMs = effectiveMinutes * 60 * 1000;
    const elapsedMs = totalMs - pomodoro.remainingMs;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    if (elapsedMinutes > 0) {
      onEarlyFinishRef.current(elapsedMinutes);
    }

    // Always show the dialog — it handles both "task done?" and "abort?" options
    pendingFinishRef.current = finishPomodoro;
    setTaskCompleteDialogOpen(true);
  };

  // Dialog: mark task as done + finish pomodoro
  const handleTaskCompleteConfirm = () => {
    if (activeTodo) {
      onToggleDone(activeTodo.id, true);
      fireConfetti();
    }
    setTaskCompleteDialogOpen(false);
    pendingFinishRef.current?.();
    pendingFinishRef.current = null;
  };

  // Dialog: finish pomodoro without marking task as done
  const handleTaskCompleteDecline = () => {
    setTaskCompleteDialogOpen(false);
    pendingFinishRef.current?.();
    pendingFinishRef.current = null;
  };

  // Dialog: abort pomodoro entirely (no session booked)
  const handleAbort = () => {
    setTaskCompleteDialogOpen(false);
    pendingFinishRef.current = null;
    pomodoro.reset();
    setOverrideMinutes(null);
  };

  // Direct cancel (used in first minute when no dialog is shown)
  const handleCancel = () => {
    pomodoro.reset();
    setOverrideMinutes(null);
  };

  const handleSkipBreak = () => {
    breakTimer.skip();
    setPhase("pomodoro");
  };

  const handleMinutesChange = (minutes: number) => {
    setOverrideMinutes(minutes);
  };

  // --- Build timerDisplay and controls based on phase ---

  if (phase === "break") {
    const breakVariant: TimerVariant = breakTimer.isOvertime ? "overtime" : "break";

    const timerDisplay = (
      <div className="flex flex-col items-center gap-2">
        <TimerCircle
          progress={breakTimer.progress}
          minutes={breakTimer.minutes}
          seconds={breakTimer.seconds}
          variant={breakVariant}
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Coffee className="h-4 w-4 text-break" />
          <span>{t("timer.break")}</span>
        </div>
      </div>
    );

    const controls = (
      <div className="flex gap-3 justify-center">
        {breakTimer.isOvertime ? (
          <Button onClick={handleSkipBreak} size="lg" variant="destructive" className="gap-2">
            <Square className="h-5 w-5" />
            {t("timer.stop")}
          </Button>
        ) : (
          <Button onClick={handleSkipBreak} size="lg" variant="outline" className="gap-2">
            <SkipForward className="h-5 w-5" />
            {t("timer.skip")}
          </Button>
        )}
      </div>
    );

    return <>{children(timerDisplay, controls)}</>;
  }

  // Pomodoro phase
  const pomodoroVariant: TimerVariant = pomodoro.isOvertime ? "overtime" : "pomodoro";
  const isIdle = pomodoro.status === "idle";
  const elapsedMs = effectiveMinutes * 60 * 1000 - pomodoro.remainingMs;
  const canEarlyFinish = elapsedMs >= 60000;

  const timerDisplay = (
    <TimerCircle
      progress={pomodoro.progress}
      minutes={pomodoro.minutes}
      seconds={pomodoro.seconds}
      variant={pomodoroVariant}
      editable={isIdle}
      onMinutesChange={handleMinutesChange}
    />
  );

  const controls = (
    <>
      <div className="flex gap-3 justify-center">
        {pomodoro.status === "idle" || pomodoro.status === "paused" ? (
          <Button onClick={pomodoro.start} size="lg" className="gap-2">
            <Play className="h-5 w-5" />
            {pomodoro.status === "paused" ? t("timer.resume") : t("timer.start")}
          </Button>
        ) : pomodoro.status === "running" && !canEarlyFinish ? (
          <Button onClick={handleCancel} size="lg" variant="outline" className="gap-2">
            <X className="h-5 w-5" />
            {t("timer.cancel")}
          </Button>
        ) : pomodoro.status === "running" && allowEarlyFinish ? (
          <Button onClick={handleEarlyFinish} size="lg" variant="default" className="gap-2">
            <Check className="h-5 w-5" />
            {t("timer.finish")}
          </Button>
        ) : pomodoro.status === "overtime" ? (
          <Button onClick={handlePomodoroReset} size="lg" variant="default" className="gap-2">
            <Check className="h-5 w-5" />
            {t("timer.finish")}
          </Button>
        ) : null}
      </div>

      <AlertDialog open={taskCompleteDialogOpen} onOpenChange={(open) => {
        if (!open) handleTaskCompleteDecline();
      }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            {activeTodo ? (
              <>
                <AlertDialogMedia className="bg-primary/10">
                  <PartyPopper className="h-8 w-8 text-primary" />
                </AlertDialogMedia>
                <AlertDialogTitle>{t("timer.taskCompleted")}</AlertDialogTitle>
                <AlertDialogDescription>
                  <Trans i18nKey="timer.taskCompletedDescription" values={{ task: activeTodo.content }} components={{ strong: <strong /> }} />
                </AlertDialogDescription>
              </>
            ) : (
              <>
                <AlertDialogTitle>{t("timer.finishPomodoro")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("timer.finishPomodoroDescription")}
                </AlertDialogDescription>
              </>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="flex! flex-col! gap-2">
            {activeTodo && (
              <AlertDialogAction onClick={handleTaskCompleteConfirm}>
                {t("timer.yesDone")}
              </AlertDialogAction>
            )}
            <AlertDialogCancel onClick={handleTaskCompleteDecline} variant={activeTodo ? "outline" : "default"}>
              {activeTodo ? t("timer.noStillOpen") : t("timer.finishPomodoroButton")}
            </AlertDialogCancel>
            <Button onClick={handleAbort} variant="outline">
              {t("timer.abortPomodoro")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return <>{children(timerDisplay, controls)}</>;
}
