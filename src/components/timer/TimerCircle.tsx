interface TimerCircleProps {
  progress: number;
  minutes: number;
  seconds: number;
  isOvertime?: boolean;
}

export function TimerCircle({ progress, minutes, seconds, isOvertime }: TimerCircleProps) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="220" height="220" className="-rotate-90">
        <circle
          cx="110"
          cy="110"
          r={radius}
          stroke="var(--border)"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx="110"
          cy="110"
          r={radius}
          stroke={isOvertime ? "var(--destructive)" : "var(--primary)"}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-4xl font-mono font-bold ${isOvertime ? "text-destructive" : "text-foreground"}`}>
          {isOvertime ? "-" : ""}{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
