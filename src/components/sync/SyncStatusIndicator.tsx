import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/lib/sync-types";
import { RefreshCw } from "lucide-react";

interface SyncStatusIndicatorProps {
  status: ConnectionStatus;
  isPaired: boolean;
  onClick?: () => void;
  className?: string;
}

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; label: string }> = {
  connected: { color: "bg-green-500", label: "Verbunden" },
  connecting: { color: "bg-yellow-500 animate-pulse", label: "Verbindet..." },
  disconnected: { color: "bg-gray-400", label: "Getrennt" },
  error: { color: "bg-red-500", label: "Fehler" },
};

export function SyncStatusIndicator({
  status,
  isPaired,
  onClick,
  className,
}: SyncStatusIndicatorProps) {
  if (!isPaired) return null;

  const config = STATUS_CONFIG[status];

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
        "hover:bg-accent transition-colors",
        className,
      )}
      title={`Sync: ${config.label}`}
    >
      <RefreshCw className={cn(
        "h-3.5 w-3.5",
        status === "connecting" && "animate-spin",
      )} />
      <span className={cn("h-2 w-2 rounded-full", config.color)} />
    </button>
  );
}
