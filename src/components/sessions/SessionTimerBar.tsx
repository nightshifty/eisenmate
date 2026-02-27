import { Button } from "@/components/ui/button";
import { Clock, Square, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SessionTimerBarProps {
  display: string;
  pomodoroCount: number;
  onStop: () => void;
}

export function SessionTimerBar({ display, pomodoroCount, onStop }: SessionTimerBarProps) {
  const { t } = useTranslation();

  return (
    <div className="border-b bg-muted/50 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-9">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono font-medium tabular-nums">{display}</span>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            <span>{pomodoroCount} {t("sessions.pomodoro", { count: pomodoroCount })}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
          onClick={onStop}
        >
          <Square className="h-3 w-3" />
          {t("sessions.endSession")}
        </Button>
      </div>
    </div>
  );
}
