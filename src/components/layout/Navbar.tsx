import logoSrc from "@/assets/eisenmate-icon.png";
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
import { HelpCircle, History, Sun, Moon, Timer, LayoutGrid, Volume2, VolumeOff } from "lucide-react";
import type { Session, UserSettings } from "@/lib/storage";
import type { Page } from "@/App";
import { cn } from "@/lib/utils";

interface NavbarProps {
  activePage: Page;
  onPageChange: (page: Page) => void;
  settings: {
    pomodoroMinutes: number;
    breakMinutes: number;
    overtimeMaxMinutes: number;
    overtimeChimeIntervalMinutes: number;
    allowEarlyFinish: boolean;
  };
  onSaveSettings: (patch: Partial<UserSettings>) => void;
  timerRunning: boolean;
  sessions: Session[];
  todaySessions: number;
  todayMinutes: number;
  onDeleteSession: (id: string) => void;
  onClearSessions: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  silentMode: boolean;
  onToggleSilentMode: () => void;
}

export function Navbar({
  activePage,
  onPageChange,
  settings,
  onSaveSettings,
  timerRunning,
  sessions,
  todaySessions,
  todayMinutes,
  onDeleteSession,
  onClearSessions,
  theme,
  onToggleTheme,
  silentMode,
  onToggleSilentMode,
}: NavbarProps) {
  return (
    <nav className="border-b bg-card">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <img src={logoSrc} alt="Eisenmate" className="h-7 w-7 shrink-0" />
            <span className="hidden sm:inline text-xl font-bold text-primary">Eisenmate</span>
          </div>

          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-1.5 text-sm",
                activePage === "pomodoro" && "bg-accent text-accent-foreground",
              )}
              onClick={() => onPageChange("pomodoro")}
            >
              <Timer className="h-4 w-4" />
              Pomodoro
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-1.5 text-sm",
                activePage === "eisenhower" && "bg-accent text-accent-foreground",
              )}
              onClick={() => onPageChange("eisenhower")}
            >
              <LayoutGrid className="h-4 w-4" />
              Aufgaben
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <TimerSettings
            currentSettings={settings}
            onSave={onSaveSettings}
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

          <Button variant="ghost" size="icon" onClick={onToggleSilentMode} title={silentMode ? "Ton einschalten" : "Stummschalten"}>
            {silentMode ? <VolumeOff className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>

          <Button variant="ghost" size="icon" onClick={onToggleTheme}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </nav>
  );
}
