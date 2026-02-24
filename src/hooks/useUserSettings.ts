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
    overtimeMaxMinutes: settings.overtimeMaxMinutes,
    overtimeChimeIntervalMinutes: settings.overtimeChimeIntervalMinutes,
    updateSettings,
  };
}
