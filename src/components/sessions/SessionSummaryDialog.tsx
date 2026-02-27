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
import { Clock, Timer, TrendingUp, Trophy, ListChecks } from "lucide-react";
import type { SessionSummary } from "@/hooks/useSessionTimer";
import { formatDuration } from "@/lib/format";
import { useTranslation } from "react-i18next";

interface SessionSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: SessionSummary | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SessionSummaryDialog({
  open,
  onOpenChange,
  summary,
  onConfirm,
  onCancel,
}: SessionSummaryDialogProps) {
  const { t } = useTranslation();

  if (!summary) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-primary/10">
            <Trophy className="h-8 w-8 text-primary" />
          </AlertDialogMedia>
          <AlertDialogTitle>{t("sessions.endSessionQuestion")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("sessions.yourSummary")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{formatDuration(summary.totalMinutes)}</p>
                <p className="text-xs text-muted-foreground">{t("sessions.totalDuration")}</p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2.5">
              <Timer className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{summary.pomodoroCount}</p>
                <p className="text-xs text-muted-foreground">{t("sessions.pomodoro", { count: summary.pomodoroCount })}</p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2.5">
              <TrendingUp className="h-4 w-4 text-break mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{formatDuration(summary.focusMinutes)}</p>
                <p className="text-xs text-muted-foreground">{t("sessions.focusTime")}</p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2.5">
              <TrendingUp className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{summary.productivityPercent}%</p>
                <p className="text-xs text-muted-foreground">{t("sessions.productivity")}</p>
              </div>
            </div>
          </div>

          {summary.longestPomodoroMinutes > 0 && (
            <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2.5">
              <Trophy className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{formatDuration(summary.longestPomodoroMinutes)}</p>
                <p className="text-xs text-muted-foreground">{t("sessions.longestPomodoro")}</p>
              </div>
            </div>
          )}

          {summary.todoNames.length > 0 && (
            <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2.5">
              <ListChecks className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t("sessions.task", { count: summary.todoNames.length })}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {summary.todoNames.join(", ")}
                </p>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex! flex-col! gap-2">
          <AlertDialogAction onClick={onConfirm}>
            {t("sessions.endSession")}
          </AlertDialogAction>
          <AlertDialogCancel onClick={onCancel} variant="outline">
            {t("sessions.keepWorking")}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
