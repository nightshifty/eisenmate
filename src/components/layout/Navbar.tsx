import logoSrc from "@/assets/eisenmate-icon.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TimerSettings } from "@/components/timer/TimerSettings";
import { AboutPomodoro } from "@/components/help/AboutPomodoro";
import { HowToUse } from "@/components/help/HowToUse";
import { SessionHistory } from "@/components/sessions/SessionHistory";
import { SyncStatusIndicator } from "@/components/sync/SyncStatusIndicator";
import { Settings, History, Sun, Moon, Timer, LayoutGrid, Volume2, VolumeOff, MoreVertical, BookOpen, Info, RefreshCw } from "lucide-react";
import type { Session, UserSettings } from "@/lib/storage";
import type { ConnectionStatus } from "@/lib/sync-types";
import type { Page } from "@/App";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NavbarProps {
  activePage: Page;
  onPageChange: (page: Page) => void;
  settings: {
    pomodoroMinutes: number;
    breakMinutes: number;
    overtimeMaxMinutes: number;
    overtimeChimeIntervalMinutes: number;
    allowEarlyFinish: boolean;
    sessionTimerEnabled: boolean;
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
  syncStatus: ConnectionStatus;
  isSyncPaired: boolean;
  onSyncSettingsOpen: () => void;
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
  syncStatus,
  isSyncPaired,
  onSyncSettingsOpen,
}: NavbarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);

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
          <SyncStatusIndicator
            status={syncStatus}
            isPaired={isSyncPaired}
            onClick={onSyncSettingsOpen}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem disabled={timerRunning} onSelect={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
              Einstellungen
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={() => setHistoryOpen(true)}>
              <History className="h-4 w-4" />
              Verlauf
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={onSyncSettingsOpen}>
              <RefreshCw className="h-4 w-4" />
              Synchronisation
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={onToggleSilentMode}>
              {silentMode ? <VolumeOff className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {silentMode ? "Ton einschalten" : "Stummschalten"}
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={onToggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Helles Design" : "Dunkles Design"}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={() => setAboutOpen(true)}>
              <Info className="h-4 w-4" />
              Über Pomodoro
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={() => setHowToOpen(true)}>
              <BookOpen className="h-4 w-4" />
              Anleitung
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>

        {/* Dialogs rendered outside the dropdown */}
        <TimerSettings
          currentSettings={settings}
          onSave={onSaveSettings}
          disabled={timerRunning}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />

        <SessionHistory
          sessions={sessions}
          todaySessions={todaySessions}
          todayMinutes={todayMinutes}
          onDeleteSession={onDeleteSession}
          onClearSessions={onClearSessions}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        />

        <AboutPomodoro open={aboutOpen} onOpenChange={setAboutOpen} />

        <HowToUse open={howToOpen} onOpenChange={setHowToOpen} />
      </div>
    </nav>
  );
}
