import { useState, useCallback } from "react";
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

  return {
    pomodoroMinutes: settings.pomodoroMinutes,
    breakMinutes: settings.breakMinutes,
    overtimeMaxMinutes: settings.overtimeMaxMinutes,
    overtimeChimeIntervalMinutes: settings.overtimeChimeIntervalMinutes,
    allowEarlyFinish: settings.allowEarlyFinish,
    silentMode: settings.silentMode,
    sessionTimerEnabled: settings.sessionTimerEnabled,
    updateSettings,
  };
}
