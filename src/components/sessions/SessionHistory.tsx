import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Timer, Trash2 } from "lucide-react";
import type { Session } from "@/lib/storage";
import { groupByDay } from "@/lib/sessions";
import { useTranslation } from "react-i18next";
import { DATE_LOCALES, type SupportedLanguage } from "@/i18n";

interface SessionHistoryProps {
  children?: React.ReactNode;
  sessions: Session[];
  todaySessions: number;
  todayMinutes: number;
  onDeleteSession: (id: string) => void;
  onClearSessions: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SessionHistory({
  children,
  sessions,
  todaySessions,
  todayMinutes,
  onDeleteSession,
  onClearSessions,
  open,
  onOpenChange,
}: SessionHistoryProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = DATE_LOCALES[i18n.language as SupportedLanguage] ?? "en-US";

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString(dateLocale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const grouped = useMemo(
    () => groupByDay(sessions, t("sessions.today"), t("sessions.yesterday"), dateLocale),
    [sessions, t, dateLocale],
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("sessions.history")}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-muted/50 p-4 flex items-center gap-4">
          <Timer className="h-8 w-8 text-primary" />
          <div>
            <p className="text-lg font-semibold">
              {t("sessions.pomodorosToday", { count: todaySessions })}
            </p>
            <p className="text-sm text-muted-foreground">{t("sessions.focusMinutes", { count: todayMinutes })}</p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 space-y-4 pt-2">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("sessions.noSessions")}
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.label}>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">{group.label}</h4>
                <div className="space-y-2">
                  {group.sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{session.todoContent}</p>
                        <p className="text-muted-foreground">
                          {formatTime(session.completedAt)} &middot; {session.durationMinutes} min
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => onDeleteSession(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {sessions.length > 0 && (
          <div className="pt-2 border-t">
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  {t("sessions.deleteAll")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("sessions.deleteAllConfirm")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("sessions.deleteAllDescription", { count: sessions.length })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onClearSessions();
                      setConfirmOpen(false);
                    }}
                  >
                    {t("sessions.deleteAll")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
