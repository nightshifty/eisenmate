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
    breakMinutes: number;
    overtimeMaxMinutes: number;
    overtimeChimeIntervalMinutes: number;
    allowEarlyFinish: boolean;
    sessionTimerEnabled: boolean;
  };
  onSave: (patch: Partial<UserSettings>) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TimerSettings({ currentSettings, onSave, disabled, children, open: controlledOpen, onOpenChange }: TimerSettingsProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const [pomodoroMinutes, setPomodoroMinutes] = useState(String(currentSettings.pomodoroMinutes));
  const [breakMinutes, setBreakMinutes] = useState(String(currentSettings.breakMinutes));
  const [overtimeMax, setOvertimeMax] = useState(String(currentSettings.overtimeMaxMinutes));
  const [chimeInterval, setChimeInterval] = useState(String(currentSettings.overtimeChimeIntervalMinutes));
  const [allowEarlyFinish, setAllowEarlyFinish] = useState(currentSettings.allowEarlyFinish);
  const [sessionTimerEnabled, setSessionTimerEnabled] = useState(currentSettings.sessionTimerEnabled);

  const resetForm = () => {
    setPomodoroMinutes(String(currentSettings.pomodoroMinutes));
    setBreakMinutes(String(currentSettings.breakMinutes));
    setOvertimeMax(String(currentSettings.overtimeMaxMinutes));
    setChimeInterval(String(currentSettings.overtimeChimeIntervalMinutes));
    setAllowEarlyFinish(currentSettings.allowEarlyFinish);
    setSessionTimerEnabled(currentSettings.sessionTimerEnabled);
  };

  const handleOpen = (o: boolean) => {
    if (o && disabled) return;
    if (o) resetForm();
    if (isControlled) {
      onOpenChange?.(o);
    } else {
      setInternalOpen(o);
    }
  };

  const handleSave = () => {
    const pomo = parseInt(pomodoroMinutes, 10);
    const brk = parseInt(breakMinutes, 10);
    const otMax = parseInt(overtimeMax, 10);
    const chime = parseInt(chimeInterval, 10);
    if (
      pomo > 0 && pomo <= 120 &&
      brk > 0 && brk <= 30 &&
      otMax > 0 && otMax <= 180 &&
      chime > 0 && chime <= 60
    ) {
      onSave({
        pomodoroMinutes: pomo,
        breakMinutes: brk,
        overtimeMaxMinutes: otMax,
        overtimeChimeIntervalMinutes: chime,
        allowEarlyFinish,
        sessionTimerEnabled,
      });
      handleOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      {children ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" disabled={disabled}>
            <Settings className="h-5 w-5" />
          </Button>
        </DialogTrigger>
      ) : null}
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
            <Label htmlFor="break-minutes">Pausendauer (Minuten)</Label>
            <Input
              id="break-minutes"
              type="number"
              min={1}
              max={30}
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
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
          <div className="flex items-center gap-2">
            <input
              id="allow-early-finish"
              type="checkbox"
              checked={allowEarlyFinish}
              onChange={(e) => setAllowEarlyFinish(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <Label htmlFor="allow-early-finish">Frühzeitiges Abschließen erlauben</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="session-timer-enabled"
              type="checkbox"
              checked={sessionTimerEnabled}
              onChange={(e) => setSessionTimerEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <Label htmlFor="session-timer-enabled">Session-Timer anzeigen</Label>
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
