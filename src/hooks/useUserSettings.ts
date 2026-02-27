import { useState, useCallback, useEffect } from "react";
import { getSettings, saveSettings, type UserSettings } from "@/lib/storage";
import { SYNC_UPDATE_EVENT } from "@/lib/sync-types";

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(getSettings);

  // Re-read from storage when sync engine updates data
  useEffect(() => {
    const handleSyncUpdate = () => {
      setSettings(getSettings());
    };
    window.addEventListener(SYNC_UPDATE_EVENT, handleSyncUpdate);
    return () => window.removeEventListener(SYNC_UPDATE_EVENT, handleSyncUpdate);
  }, []);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch, updatedAt: Date.now() };
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
