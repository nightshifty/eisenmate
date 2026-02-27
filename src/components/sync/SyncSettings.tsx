import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  RefreshCw,
  Unlink,
  Link2,
  Wifi,
  WifiOff,
  Shield,
} from "lucide-react";
import type { ConnectionStatus, SyncConfig } from "@/lib/sync-types";

interface SyncSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  syncConfig: SyncConfig;
  connectionStatus: ConnectionStatus;
  onStartPairing: () => void;
  onUnpair: () => void;
  onSyncNow: () => void;
  onToggleSync: (enabled: boolean) => void;
}

export function SyncSettings({
  open,
  onOpenChange,
  syncConfig,
  connectionStatus,
  onStartPairing,
  onUnpair,
  onSyncNow,
  onToggleSync,
}: SyncSettingsProps) {
  const isPaired = !!syncConfig.peerDeviceId;
  const isConnected = connectionStatus === "connected";

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return "Noch nie";
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return "Gerade eben";
    if (diff < 3600000) return `Vor ${Math.floor(diff / 60000)} Min.`;
    if (diff < 86400000) return `Vor ${Math.floor(diff / 3600000)} Std.`;
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Synchronisation
          </DialogTitle>
          <DialogDescription>
            Synchronisiere deine Daten zwischen zwei Geräten im lokalen Netzwerk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Sync Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="sync-enabled" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Synchronisation aktiv
            </Label>
            <input
              id="sync-enabled"
              type="checkbox"
              checked={syncConfig.enabled}
              onChange={(e) => onToggleSync(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
          </div>

          {syncConfig.enabled && (
            <>
              {/* Connection Status */}
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Verbindungsstatus</span>
                  <StatusBadge status={connectionStatus} />
                </div>

                {isPaired && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Gekoppeltes Gerät</span>
                      <span className="font-mono text-xs">{syncConfig.peerDeviceId}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Letzter Sync</span>
                      <span>{formatLastSync(syncConfig.lastSyncAt)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Security Info */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Shield className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Alle Daten werden Ende-zu-Ende verschlüsselt übertragen.
                  Nur gekoppelte Geräte können die Daten lesen.
                </span>
              </div>

              {/* Actions */}
              {!isPaired ? (
                <Button className="w-full" onClick={onStartPairing}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Gerät koppeln
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={onSyncNow}
                    disabled={!isConnected}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Jetzt synchronisieren
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="w-full text-destructive hover:text-destructive">
                        <Unlink className="h-4 w-4 mr-2" />
                        Gerät entkoppeln
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Gerät entkoppeln?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Die Synchronisation wird beendet und der Verbindungsschlüssel gelöscht.
                          Du kannst die Geräte später erneut koppeln.
                          Deine lokalen Daten bleiben erhalten.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={onUnpair}>
                          Entkoppeln
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </>
          )}

          {!syncConfig.enabled && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Aktiviere die Synchronisation, um Daten zwischen Geräten abzugleichen.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const config: Record<ConnectionStatus, { icon: typeof Wifi; label: string; className: string }> = {
    connected: { icon: Wifi, label: "Verbunden", className: "text-green-600 bg-green-50 dark:bg-green-950" },
    connecting: { icon: RefreshCw, label: "Verbindet...", className: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950" },
    disconnected: { icon: WifiOff, label: "Getrennt", className: "text-gray-500 bg-gray-50 dark:bg-gray-900" },
    error: { icon: WifiOff, label: "Fehler", className: "text-red-600 bg-red-50 dark:bg-red-950" },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <Icon className={`h-3 w-3 ${status === "connecting" ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}
