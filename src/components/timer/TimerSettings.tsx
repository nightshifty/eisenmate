import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import type { UserSettings } from "@/lib/storage";

interface TimerSettingsProps {
  currentSettings: {
    pomodoroMinutes: number;
    overtimeMaxMinutes: number;
    overtimeChimeIntervalMinutes: number;
  };
  onSave: (patch: Partial<UserSettings>) => void;
  disabled?: boolean;
}

export function TimerSettings({ currentSettings, onSave, disabled }: TimerSettingsProps) {
  const [open, setOpen] = useState(false);
  const [pomodoroMinutes, setPomodoroMinutes] = useState(String(currentSettings.pomodoroMinutes));
  const [overtimeMax, setOvertimeMax] = useState(String(currentSettings.overtimeMaxMinutes));
  const [chimeInterval, setChimeInterval] = useState(String(currentSettings.overtimeChimeIntervalMinutes));

  const handleOpen = (o: boolean) => {
    if (disabled) return;
    setOpen(o);
    if (o) {
      setPomodoroMinutes(String(currentSettings.pomodoroMinutes));
      setOvertimeMax(String(currentSettings.overtimeMaxMinutes));
      setChimeInterval(String(currentSettings.overtimeChimeIntervalMinutes));
    }
  };

  const handleSave = () => {
    const pomo = parseInt(pomodoroMinutes, 10);
    const otMax = parseInt(overtimeMax, 10);
    const chime = parseInt(chimeInterval, 10);
    if (pomo > 0 && pomo <= 120 && otMax > 0 && otMax <= 180 && chime > 0 && chime <= 60) {
      onSave({
        pomodoroMinutes: pomo,
        overtimeMaxMinutes: otMax,
        overtimeChimeIntervalMinutes: chime,
      });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled}>
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Timer-Einstellungen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="pomodoro-minutes">Pomodoro-Dauer (Minuten)</Label>
            <Input
              id="pomodoro-minutes"
              type="number"
              min={1}
              max={120}
              value={pomodoroMinutes}
              onChange={(e) => setPomodoroMinutes(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="overtime-max">Maximale Overtime (Minuten)</Label>
            <Input
              id="overtime-max"
              type="number"
              min={1}
              max={180}
              value={overtimeMax}
              onChange={(e) => setOvertimeMax(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chime-interval">Erinnerungston-Intervall (Minuten)</Label>
            <Input
              id="chime-interval"
              type="number"
              min={1}
              max={60}
              value={chimeInterval}
              onChange={(e) => setChimeInterval(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Wird lokal in deinem Browser gespeichert.
          </p>
          <Button onClick={handleSave} className="w-full">
            Speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
