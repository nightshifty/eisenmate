import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { SyncConflict, ResolvedConflict } from "@/lib/sync-types";
import type { Todo, UserSettings } from "@/lib/storage";
import { useState } from "react";

interface ConflictDialogProps {
  conflicts: SyncConflict[];
  onResolve: (resolutions: ResolvedConflict[]) => void;
}

export function ConflictDialog({ conflicts, onResolve }: ConflictDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolutions, setResolutions] = useState<ResolvedConflict[]>([]);

  if (conflicts.length === 0) return null;

  const current = conflicts[currentIndex];
  const isLast = currentIndex === conflicts.length - 1;

  const handleResolve = (resolution: "local" | "remote") => {
    const newResolution: ResolvedConflict = {
      target: current.target,
      itemId: current.itemId,
      resolution,
    };

    const updated = [...resolutions, newResolution];

    if (isLast) {
      onResolve(updated);
    } else {
      setResolutions(updated);
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <AlertDialog open={conflicts.length > 0}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Sync-Konflikt ({currentIndex + 1}/{conflicts.length})
          </AlertDialogTitle>
          <AlertDialogDescription>
            Beide Geräte haben unterschiedliche Änderungen gemacht.
            Welche Version möchtest du behalten?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 pt-2">
          {current.target === "todos" && (
            <TodoConflictView
              local={current.localVersion as Todo}
              remote={current.remoteVersion as Todo}
            />
          )}

          {current.target === "settings" && (
            <SettingsConflictView
              local={current.localVersion as UserSettings}
              remote={current.remoteVersion as UserSettings}
            />
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleResolve("local")}
            >
              Dieses Gerät
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleResolve("remote")}
            >
              Anderes Gerät
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TodoConflictView({ local, remote }: { local: Todo; remote: Todo }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <ConflictCard label="Dieses Gerät">
        <p className="font-medium">{local.content}</p>
        <p className="text-xs text-muted-foreground">
          {local.done ? "Erledigt" : "Offen"} · {local.timeSpentMinutes} Min.
        </p>
        {local.quadrant && (
          <p className="text-xs text-muted-foreground">{local.quadrant}</p>
        )}
      </ConflictCard>
      <ConflictCard label="Anderes Gerät">
        <p className="font-medium">{remote.content}</p>
        <p className="text-xs text-muted-foreground">
          {remote.done ? "Erledigt" : "Offen"} · {remote.timeSpentMinutes} Min.
        </p>
        {remote.quadrant && (
          <p className="text-xs text-muted-foreground">{remote.quadrant}</p>
        )}
      </ConflictCard>
    </div>
  );
}

function SettingsConflictView({
  local,
  remote,
}: {
  local: UserSettings;
  remote: UserSettings;
}) {
  const fields = [
    { label: "Pomodoro", local: `${local.pomodoroMinutes} Min.`, remote: `${remote.pomodoroMinutes} Min.` },
    { label: "Pause", local: `${local.breakMinutes} Min.`, remote: `${remote.breakMinutes} Min.` },
    { label: "Max. Overtime", local: `${local.overtimeMaxMinutes} Min.`, remote: `${remote.overtimeMaxMinutes} Min.` },
  ];

  const diffs = fields.filter((f) => f.local !== f.remote);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Unterschiedliche Einstellungen:</p>
      {diffs.map((diff) => (
        <div key={diff.label} className="grid grid-cols-3 text-sm gap-2">
          <span className="text-muted-foreground">{diff.label}</span>
          <span className="text-center">{diff.local}</span>
          <span className="text-center">{diff.remote}</span>
        </div>
      ))}
    </div>
  );
}

function ConflictCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3 space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
      {children}
    </div>
  );
}
