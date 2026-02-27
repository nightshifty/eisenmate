import { render, screen, fireEvent } from "@testing-library/react";
import { TimerSettings } from "./TimerSettings";
import type { UserSettings } from "@/lib/storage";

// ---- helpers ----------------------------------------------------------------

function defaultSettings() {
  return {
    pomodoroMinutes: 25,
    breakMinutes: 5,
    overtimeMaxMinutes: 90,
    overtimeChimeIntervalMinutes: 5,
    allowEarlyFinish: true,
    sessionTimerEnabled: true,
  };
}

function renderSettings(overrides: {
  currentSettings?: Partial<ReturnType<typeof defaultSettings>>;
  onSave?: (patch: Partial<UserSettings>) => void;
  disabled?: boolean;
} = {}) {
  const onSave = overrides.onSave ?? vi.fn();
  const settings = { ...defaultSettings(), ...overrides.currentSettings };

  render(
    <TimerSettings
      currentSettings={settings}
      onSave={onSave}
      disabled={overrides.disabled}
      open={true}
      onOpenChange={() => {}}
    />,
  );

  return { onSave };
}

function setInputValue(labelPattern: RegExp, value: string) {
  const input = screen.getByLabelText(labelPattern);
  fireEvent.change(input, { target: { value } });
}

function clickSave() {
  fireEvent.click(screen.getByRole("button", { name: /save/i }));
}

// ---- setup ------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

// ---- tests ------------------------------------------------------------------

describe("TimerSettings — valid form submission", () => {
  it("saves all settings with valid values", () => {
    const { onSave } = renderSettings();

    setInputValue(/pomodoro/i, "30");
    setInputValue(/break/i, "10");
    setInputValue(/max.*overtime/i, "60");
    setInputValue(/chime/i, "3");
    clickSave();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        pomodoroMinutes: 30,
        breakMinutes: 10,
        overtimeMaxMinutes: 60,
        overtimeChimeIntervalMinutes: 3,
      }),
    );
  });

  it("saves boundary min values (all fields = 1)", () => {
    const { onSave } = renderSettings();

    setInputValue(/pomodoro/i, "1");
    setInputValue(/break/i, "1");
    setInputValue(/max.*overtime/i, "1");
    setInputValue(/chime/i, "1");
    clickSave();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        pomodoroMinutes: 1,
        breakMinutes: 1,
        overtimeMaxMinutes: 1,
        overtimeChimeIntervalMinutes: 1,
      }),
    );
  });

  it("saves boundary max values", () => {
    const { onSave } = renderSettings();

    setInputValue(/pomodoro/i, "120");
    setInputValue(/break/i, "30");
    setInputValue(/max.*overtime/i, "180");
    setInputValue(/chime/i, "60");
    clickSave();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        pomodoroMinutes: 120,
        breakMinutes: 30,
        overtimeMaxMinutes: 180,
        overtimeChimeIntervalMinutes: 60,
      }),
    );
  });
});

describe("TimerSettings — invalid form values are rejected", () => {
  it("rejects pomodoroMinutes = 0", () => {
    const { onSave } = renderSettings();
    setInputValue(/pomodoro/i, "0");
    clickSave();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejects pomodoroMinutes > 120", () => {
    const { onSave } = renderSettings();
    setInputValue(/pomodoro/i, "121");
    clickSave();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejects breakMinutes = 0", () => {
    const { onSave } = renderSettings();
    setInputValue(/break/i, "0");
    clickSave();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejects breakMinutes > 30", () => {
    const { onSave } = renderSettings();
    setInputValue(/break/i, "31");
    clickSave();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejects overtimeMaxMinutes = 0", () => {
    const { onSave } = renderSettings();
    setInputValue(/max.*overtime/i, "0");
    clickSave();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejects overtimeMaxMinutes > 180", () => {
    const { onSave } = renderSettings();
    setInputValue(/max.*overtime/i, "181");
    clickSave();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejects chimeInterval = 0", () => {
    const { onSave } = renderSettings();
    setInputValue(/chime/i, "0");
    clickSave();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejects chimeInterval > 60", () => {
    const { onSave } = renderSettings();
    setInputValue(/chime/i, "61");
    clickSave();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejects non-numeric input (NaN)", () => {
    const { onSave } = renderSettings();
    setInputValue(/pomodoro/i, "abc");
    clickSave();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("TimerSettings — checkbox toggles", () => {
  it("saves allowEarlyFinish = false when unchecked", () => {
    const { onSave } = renderSettings({ currentSettings: { allowEarlyFinish: true } });

    const checkbox = screen.getByLabelText(/early finish/i);
    fireEvent.click(checkbox);
    clickSave();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ allowEarlyFinish: false }),
    );
  });

  it("saves sessionTimerEnabled = false when unchecked", () => {
    const { onSave } = renderSettings({ currentSettings: { sessionTimerEnabled: true } });

    const checkbox = screen.getByLabelText(/session timer/i);
    fireEvent.click(checkbox);
    clickSave();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ sessionTimerEnabled: false }),
    );
  });
});
