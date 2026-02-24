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

interface SessionHistoryProps {
  children: React.ReactNode;
  sessions: Session[];
  todaySessions: number;
  todayMinutes: number;
  onDeleteSession: (id: string) => void;
  onClearSessions: () => void;
}

interface GroupedSessions {
  label: string;
  sessions: Session[];
}

function groupByDay(sessions: Session[]): GroupedSessions[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Map<string, { label: string; sessions: Session[] }> = new Map();

  for (const session of sessions) {
    const date = new Date(session.completedAt);
    date.setHours(0, 0, 0, 0);

    let label: string;
    let key: string;
    if (date.getTime() === today.getTime()) {
      label = "Heute";
      key = "today";
    } else if (date.getTime() === yesterday.getTime()) {
      label = "Gestern";
      key = "yesterday";
    } else {
      label = date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      key = label;
    }

    if (!groups.has(key)) {
      groups.set(key, { label, sessions: [] });
    }
    groups.get(key)!.sessions.push(session);
  }

  return Array.from(groups.values());
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionHistory({
  children,
  sessions,
  todaySessions,
  todayMinutes,
  onDeleteSession,
  onClearSessions,
}: SessionHistoryProps) {
  const grouped = useMemo(() => groupByDay(sessions), [sessions]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Session-Verlauf</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-muted/50 p-4 flex items-center gap-4">
          <Timer className="h-8 w-8 text-primary" />
          <div>
            <p className="text-lg font-semibold">
              {todaySessions} {todaySessions === 1 ? "Pomodoro" : "Pomodoros"} heute
            </p>
            <p className="text-sm text-muted-foreground">{todayMinutes} Minuten Fokuszeit</p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 space-y-4 pt-2">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Noch keine Sessions abgeschlossen.
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
                  Alle löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Alle Sessions löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Damit werden alle {sessions.length} Sessions unwiderruflich gelöscht.
                    Diese Aktion kann nicht rückgängig gemacht werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onClearSessions();
                      setConfirmOpen(false);
                    }}
                  >
                    Alle löschen
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
