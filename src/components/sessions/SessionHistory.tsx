import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Timer } from "lucide-react";
import type { Session } from "@/lib/storage";

interface SessionHistoryProps {
  children: React.ReactNode;
  sessions: Session[];
  todaySessions: number;
  todayMinutes: number;
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

export function SessionHistory({ children, sessions, todaySessions, todayMinutes }: SessionHistoryProps) {
  const grouped = useMemo(() => groupByDay(sessions), [sessions]);

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
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
