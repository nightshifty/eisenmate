import confetti from "canvas-confetti";

/**
 * Fires a short, celebratory confetti burst.
 * Used when the user marks a task as completed.
 */
export function fireConfetti(): void {
  // First burst — center-left
  confetti({
    particleCount: 60,
    spread: 55,
    origin: { x: 0.4, y: 0.5 },
    colors: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"],
  });

  // Second burst — center-right, slightly delayed
  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 55,
      origin: { x: 0.6, y: 0.5 },
      colors: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"],
    });
  }, 100);
}
