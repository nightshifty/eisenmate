import { useState, useRef, useEffect } from "react";

export type TimerVariant = "pomodoro" | "break" | "overtime";

interface TimerCircleProps {
  progress: number;
  minutes: number;
  seconds: number;
  variant?: TimerVariant;
  editable?: boolean;
  onMinutesChange?: (minutes: number) => void;
}

const strokeColors: Record<TimerVariant, string> = {
  pomodoro: "var(--primary)",
  break: "var(--break)",
  overtime: "var(--destructive)",
};

const textClasses: Record<TimerVariant, string> = {
  pomodoro: "text-foreground",
  break: "text-break",
  overtime: "text-destructive",
};

export function TimerCircle({ progress, minutes, seconds, variant = "pomodoro", editable = false, onMinutesChange }: TimerCircleProps) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const isOvertime = variant === "overtime";

  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleDoubleClick = () => {
    if (!editable) return;
    setInputValue(String(minutes));
    setEditing(true);
  };

  const confirmEdit = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 120) {
      onMinutesChange?.(parsed);
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <div className="relative w-[60vw] max-w-56 sm:max-w-88 md:max-w-104 lg:max-w-md aspect-square">
      <svg viewBox="0 0 220 220" className="w-full h-full -rotate-90">
        <circle
          cx="110"
          cy="110"
          r={radius}
          stroke="var(--border)"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx="110"
          cy="110"
          r={radius}
          stroke={strokeColors[variant]}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {editing ? (
          <div className="flex items-baseline gap-0.5">
            <input
              ref={inputRef}
              type="number"
              min={1}
              max={120}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={confirmEdit}
              className="w-[3ch] text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-mono font-bold bg-transparent border-b-2 border-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-mono font-bold text-muted-foreground">min</span>
          </div>
        ) : (
          <span
            className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-mono font-bold ${textClasses[variant]} ${editable ? "cursor-pointer hover:opacity-70 transition-opacity" : ""}`}
            onDoubleClick={handleDoubleClick}
          >
            {isOvertime ? "-" : ""}{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
        )}
      </div>
    </div>
  );
}
