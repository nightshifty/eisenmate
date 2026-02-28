import { useState, useCallback } from "react";
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
import { Clock, Timer, TrendingUp, Trophy, ListChecks, Pencil, Check } from "lucide-react";
import type { SessionSummary } from "@/hooks/useSessionTimer";
import { formatDuration } from "@/lib/format";
import { useTranslation } from "react-i18next";

function timestampToTimeString(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function timeStringToTimestamp(timeStr: string, referenceTs: number): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const d = new Date(referenceTs);
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

interface SessionSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: SessionSummary | null;
  onConfirm: (adjustedStartTime?: number, adjustedEndTime?: number) => void;
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

  const [editing, setEditing] = useState(false);
  // Store only the user's overrides; null means "use original from summary"
  const [startTimeOverride, setStartTimeOverride] = useState<string | null>(null);
  const [endTimeOverride, setEndTimeOverride] = useState<string | null>(null);

  const startTimeStr = startTimeOverride ?? (summary ? timestampToTimeString(summary.startTime) : "");
  const endTimeStr = endTimeOverride ?? (summary ? timestampToTimeString(summary.endTime) : "");

  const getAdjustedTimestamps = useCallback(() => {
    if (!summary) return { start: 0, end: 0 };
    return {
      start: timeStringToTimestamp(startTimeStr, summary.startTime),
      end: timeStringToTimestamp(endTimeStr, summary.endTime),
    };
  }, [summary, startTimeStr, endTimeStr]);

  const adjusted = getAdjustedTimestamps();
  const adjustedTotalMinutes = Math.round((adjusted.end - adjusted.start) / 60000);
  const isValid = adjusted.end > adjusted.start && adjustedTotalMinutes > 0;
  const wasAdjusted = startTimeOverride !== null || endTimeOverride !== null;

  const effectiveTotalMinutes = isValid ? adjustedTotalMinutes : (summary?.totalMinutes ?? 0);
  const effectiveProductivity =
    effectiveTotalMinutes > 0 && summary
      ? Math.min(100, Math.round((summary.focusMinutes / effectiveTotalMinutes) * 100))
      : 0;

  const resetOverrides = () => {
    setStartTimeOverride(null);
    setEndTimeOverride(null);
    setEditing(false);
  };

  const handleConfirm = () => {
    if (wasAdjusted && isValid) {
      onConfirm(adjusted.start, adjusted.end);
    } else {
      onConfirm();
    }
    resetOverrides();
  };

  const handleCancel = () => {
    onCancel();
    resetOverrides();
  };

  const handleStartEdit = () => {
    // Initialize overrides with current values when entering edit mode
    setStartTimeOverride(startTimeStr);
    setEndTimeOverride(endTimeStr);
    setEditing(true);
  };

  const handleConfirmEdit = () => {
    if (isValid) {
      setEditing(false);
    }
  };

  if (!summary) return null;

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) resetOverrides(); onOpenChange(v); }}>
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
            {/* Total duration tile with editable times */}
            <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{formatDuration(effectiveTotalMinutes)}</p>
                <p className="text-xs text-muted-foreground">{t("sessions.totalDuration")}</p>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="flex items-center gap-1 mt-1 cursor-pointer"
                >
                  <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {startTimeStr} – {endTimeStr}
                  </span>
                  <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
                </button>
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
                <p className="text-sm font-medium">{effectiveProductivity}%</p>
                <p className="text-xs text-muted-foreground">{t("sessions.productivity")}</p>
              </div>
            </div>
          </div>

          {editing && (
            <div className="rounded-lg border border-primary/30 bg-muted/50 p-3 flex items-center gap-3">
              <div className="flex items-center gap-1.5 flex-1">
                <div className="flex flex-col">
                  <input
                    type="time"
                    value={startTimeStr}
                    onChange={(e) => setStartTimeOverride(e.target.value)}
                    className={`w-[5.5rem] text-xs font-medium bg-transparent border-b-2 outline-none px-1 py-0.5 text-center ${isValid ? "border-primary" : "border-destructive"}`}
                  />
                  <span className="text-[10px] text-muted-foreground text-center mt-0.5">
                    {t("sessions.start")}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">–</span>
                <div className="flex flex-col">
                  <input
                    type="time"
                    value={endTimeStr}
                    onChange={(e) => setEndTimeOverride(e.target.value)}
                    className={`w-[5.5rem] text-xs font-medium bg-transparent border-b-2 outline-none px-1 py-0.5 text-center ${isValid ? "border-primary" : "border-destructive"}`}
                  />
                  <span className="text-[10px] text-muted-foreground text-center mt-0.5">
                    {t("sessions.end")}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleConfirmEdit}
                disabled={!isValid}
                className="p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-40"
                aria-label="Confirm"
              >
                <Check className="h-4 w-4 text-primary" />
              </button>
            </div>
          )}

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
          <AlertDialogAction onClick={handleConfirm}>
            {t("sessions.endSession")}
          </AlertDialogAction>
          <AlertDialogCancel onClick={handleCancel} variant="outline">
            {t("sessions.keepWorking")}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
