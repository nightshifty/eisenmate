import { useState, useCallback, useEffect } from "react";
import { getSettings, saveSettings, type UserSettings } from "@/lib/storage";

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(getSettings);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const refreshSettings = useCallback(() => {
    setSettings(getSettings());
  }, []);

  // Auto-refresh when sync completes
  useEffect(() => {
    const handler = () => refreshSettings();
    window.addEventListener("eisenmate-sync-complete", handler);
    return () => window.removeEventListener("eisenmate-sync-complete", handler);
  }, [refreshSettings]);

  return {
    pomodoroMinutes: settings.pomodoroMinutes,
    breakMinutes: settings.breakMinutes,
    overtimeMaxMinutes: settings.overtimeMaxMinutes,
    overtimeChimeIntervalMinutes: settings.overtimeChimeIntervalMinutes,
    allowEarlyFinish: settings.allowEarlyFinish,
    silentMode: settings.silentMode,
    sessionTimerEnabled: settings.sessionTimerEnabled,
    updateSettings,
    refreshSettings,
  };
}
