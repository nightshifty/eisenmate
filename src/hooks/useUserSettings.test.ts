import { renderHook, act } from "@testing-library/react";
import { useUserSettings } from "./useUserSettings";
import { getSettings, saveSettings } from "@/lib/storage";

// ---- setup ------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

// ---- tests ------------------------------------------------------------------

describe("useUserSettings — default values", () => {
  it("returns default settings when nothing is stored", () => {
    const { result } = renderHook(() => useUserSettings());
    expect(result.current.pomodoroMinutes).toBe(25);
    expect(result.current.breakMinutes).toBe(5);
    expect(result.current.overtimeMaxMinutes).toBe(90);
    expect(result.current.overtimeChimeIntervalMinutes).toBe(5);
    expect(result.current.allowEarlyFinish).toBe(true);
    expect(result.current.silentMode).toBe(false);
    expect(result.current.sessionTimerEnabled).toBe(true);
  });
});

describe("useUserSettings — restores from localStorage", () => {
  it("restores stored settings on mount", () => {
    saveSettings({
      pomodoroMinutes: 30,
      breakMinutes: 10,
      overtimeMaxMinutes: 60,
      overtimeChimeIntervalMinutes: 3,
      allowEarlyFinish: false,
      silentMode: true,
      sessionTimerEnabled: false,
    });

    const { result } = renderHook(() => useUserSettings());
    expect(result.current.pomodoroMinutes).toBe(30);
    expect(result.current.breakMinutes).toBe(10);
    expect(result.current.overtimeMaxMinutes).toBe(60);
    expect(result.current.overtimeChimeIntervalMinutes).toBe(3);
    expect(result.current.allowEarlyFinish).toBe(false);
    expect(result.current.silentMode).toBe(true);
    expect(result.current.sessionTimerEnabled).toBe(false);
  });

  it("merges partial stored settings with defaults", () => {
    // Only store pomodoroMinutes — everything else should use defaults
    localStorage.setItem(
      "eisenmate_settings",
      JSON.stringify({ pomodoroMinutes: 50 }),
    );

    const { result } = renderHook(() => useUserSettings());
    expect(result.current.pomodoroMinutes).toBe(50);
    expect(result.current.breakMinutes).toBe(5); // default
  });
});

describe("useUserSettings — updateSettings", () => {
  it("updates a single field and re-renders", () => {
    const { result } = renderHook(() => useUserSettings());

    act(() => result.current.updateSettings({ pomodoroMinutes: 45 }));
    expect(result.current.pomodoroMinutes).toBe(45);
  });

  it("persists updated settings to localStorage", () => {
    const { result } = renderHook(() => useUserSettings());

    act(() => result.current.updateSettings({ breakMinutes: 15 }));
    const stored = getSettings();
    expect(stored.breakMinutes).toBe(15);
  });

  it("preserves other fields when updating a single field", () => {
    const { result } = renderHook(() => useUserSettings());

    act(() => result.current.updateSettings({ pomodoroMinutes: 45 }));
    // All other fields should remain at defaults
    expect(result.current.breakMinutes).toBe(5);
    expect(result.current.allowEarlyFinish).toBe(true);
    expect(result.current.silentMode).toBe(false);
  });

  it("can update multiple fields at once", () => {
    const { result } = renderHook(() => useUserSettings());

    act(() =>
      result.current.updateSettings({
        pomodoroMinutes: 50,
        breakMinutes: 15,
        silentMode: true,
      }),
    );

    expect(result.current.pomodoroMinutes).toBe(50);
    expect(result.current.breakMinutes).toBe(15);
    expect(result.current.silentMode).toBe(true);
  });

  it("successive updates accumulate correctly", () => {
    const { result } = renderHook(() => useUserSettings());

    act(() => result.current.updateSettings({ pomodoroMinutes: 30 }));
    act(() => result.current.updateSettings({ breakMinutes: 10 }));

    expect(result.current.pomodoroMinutes).toBe(30);
    expect(result.current.breakMinutes).toBe(10);

    // localStorage should have both
    const stored = getSettings();
    expect(stored.pomodoroMinutes).toBe(30);
    expect(stored.breakMinutes).toBe(10);
  });
});
