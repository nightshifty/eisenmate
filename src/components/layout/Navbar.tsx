import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TimerSettings } from "@/components/timer/TimerSettings";
import { AboutPomodoro } from "@/components/help/AboutPomodoro";
import { HowToUse } from "@/components/help/HowToUse";
import { SessionHistory } from "@/components/sessions/SessionHistory";
import { HelpCircle, History, Sun, Moon } from "lucide-react";
import type { Session } from "@/lib/storage";

interface NavbarProps {
  pomodoroMinutes: number;
  onSaveMinutes: (minutes: number) => void;
  timerRunning: boolean;
  sessions: Session[];
  todaySessions: number;
  todayMinutes: number;
  onDeleteSession: (id: string) => void;
  onClearSessions: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function Navbar({ pomodoroMinutes, onSaveMinutes, timerRunning, sessions, todaySessions, todayMinutes, onDeleteSession, onClearSessions, theme, onToggleTheme }: NavbarProps) {
  return (
    <nav className="border-b bg-card">
      <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-14">
        <span className="text-xl font-bold text-primary">Eisenmate</span>

        <div className="flex items-center gap-1">
          <TimerSettings
            currentMinutes={pomodoroMinutes}
            onSave={onSaveMinutes}
            disabled={timerRunning}
          />

          <SessionHistory
            sessions={sessions}
            todaySessions={todaySessions}
            todayMinutes={todayMinutes}
            onDeleteSession={onDeleteSession}
            onClearSessions={onClearSessions}
          >
            <Button variant="ghost" size="icon">
              <History className="h-5 w-5" />
            </Button>
          </SessionHistory>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <AboutPomodoro>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Über Pomodoro
                </DropdownMenuItem>
              </AboutPomodoro>
              <HowToUse>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Anleitung
                </DropdownMenuItem>
              </HowToUse>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={onToggleTheme}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </nav>
  );
}
