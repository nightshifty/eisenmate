import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface HowToUseProps {
  children: React.ReactNode;
}

export function HowToUse({ children }: HowToUseProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>So benutzt du Eisenmate</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li>Erstelle Aufgaben in deiner Todo-Liste</li>
            <li>Gib eine Zeitschätzung für jede Aufgabe an</li>
            <li>Wähle eine Aufgabe aus und starte den Timer</li>
            <li>Die aufgewendete Zeit wird automatisch erfasst</li>
            <li>Du kannst die Timer-Dauer in den Einstellungen ändern</li>
            <li>Bei Ablauf ertönt ein akustisches Signal</li>
            <li>Alle Daten werden lokal in deinem Browser gespeichert</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
