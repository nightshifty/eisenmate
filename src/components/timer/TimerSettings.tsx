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

interface TimerSettingsProps {
  currentMinutes: number;
  onSave: (minutes: number) => void;
}

export function TimerSettings({ currentMinutes, onSave }: TimerSettingsProps) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(String(currentMinutes));

  const handleSave = () => {
    const val = parseInt(minutes, 10);
    if (val > 0 && val <= 120) {
      onSave(val);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setMinutes(String(currentMinutes)); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
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
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
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
