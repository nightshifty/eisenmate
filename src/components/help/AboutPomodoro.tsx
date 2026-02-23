import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AboutPomodoroProps {
  children: React.ReactNode;
}

export function AboutPomodoro({ children }: AboutPomodoroProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Was ist die Pomodoro-Technik?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Die Pomodoro-Technik ist eine Zeitmanagement-Methode, die in den späten 1980er Jahren
            von Francesco Cirillo entwickelt wurde.
          </p>
          <p>
            Die Methode verwendet einen Timer, um Arbeit in Intervalle aufzuteilen,
            traditionell 25 Minuten lang, getrennt durch kurze Pausen.
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Wähle eine Aufgabe aus</li>
            <li>Stelle den Timer auf 25 Minuten</li>
            <li>Arbeite an der Aufgabe bis der Timer klingelt</li>
            <li>Mache eine kurze Pause (5 Minuten)</li>
            <li>Nach 4 Pomodoros: längere Pause (15-30 Minuten)</li>
          </ol>
          <p>
            Der Name "Pomodoro" kommt vom italienischen Wort für Tomate - Cirillo benutzte
            eine tomatenförmige Küchenuhr als Student.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
