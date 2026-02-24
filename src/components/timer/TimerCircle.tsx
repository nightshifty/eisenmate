export type TimerVariant = "pomodoro" | "break" | "overtime";

interface TimerCircleProps {
  progress: number;
  minutes: number;
  seconds: number;
  variant?: TimerVariant;
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

export function TimerCircle({ progress, minutes, seconds, variant = "pomodoro" }: TimerCircleProps) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const isOvertime = variant === "overtime";

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
        <span className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-mono font-bold ${textClasses[variant]}`}>
          {isOvertime ? "-" : ""}{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
