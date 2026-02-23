import { useState } from "react";
import { getSettings, saveSettings } from "@/lib/storage";

export function useUserSettings() {
  const [pomodoroMinutes, setPomodoroMinutes] = useState(
    () => getSettings().pomodoroMinutes,
  );

  const updatePomodoroMinutes = (minutes: number) => {
    saveSettings({ pomodoroMinutes: minutes });
    setPomodoroMinutes(minutes);
  };

  return { pomodoroMinutes, loading: false, updatePomodoroMinutes };
}
