import { useState, useEffect, useCallback, useRef } from "react";
import { PeerManager } from "@/lib/peer-manager";
import { SyncEngine, type ConflictResolver } from "@/lib/sync-engine";
import { generateSecret, generateDeviceId } from "@/lib/crypto";
import { getSyncConfig, saveSyncConfig } from "@/lib/storage";
import type {
  SyncConfig,
  ConnectionStatus,
  PairingPayload,
  SyncConflict,
  ResolvedConflict,
} from "@/lib/sync-types";

export interface UseSyncReturn {
  /** Current sync configuration */
  syncConfig: SyncConfig;
  /** Current connection status */
  connectionStatus: ConnectionStatus;
  /** Whether sync is paired with another device */
  isPaired: boolean;
  /** Pending conflicts awaiting user resolution */
  conflicts: SyncConflict[];
  /** Pairing payload for QR code display (when acting as initiator) */
  pairingPayload: PairingPayload | null;

  /** Start the pairing process as initiator (generates QR code data) */
  startPairing: () => void;
  /** Complete pairing as responder (scanned QR code data) */
  completePairing: (payload: PairingPayload, role: "initiator" | "responder") => void;
  /** Unpair the current device */
  unpair: () => void;
  /** Toggle sync on/off */
  toggleSync: (enabled: boolean) => void;
  /** Manually trigger a full sync */
  syncNow: () => void;
  /** Resolve conflicts */
  resolveConflicts: (resolutions: ResolvedConflict[]) => void;
}

export function useSync(): UseSyncReturn {
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => getSyncConfig());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [pairingPayload, setPairingPayload] = useState<PairingPayload | null>(null);

  const peerManagerRef = useRef<PeerManager | null>(null);
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const conflictResolverRef = useRef<ConflictResolver | null>(null);
  const pairingPayloadRef = useRef<PairingPayload | null>(null);

  // Keep ref in sync with state
  pairingPayloadRef.current = pairingPayload;

  // Set up the conflict resolver callback
  conflictResolverRef.current = (incomingConflicts: SyncConflict[]) => {
    return new Promise<ResolvedConflict[]>((resolve) => {
      setConflicts(incomingConflicts);
      // Store the resolve function so resolveConflicts can call it
      pendingConflictResolveRef.current = resolve;
    });
  };

  const pendingConflictResolveRef = useRef<((resolutions: ResolvedConflict[]) => void) | null>(null);

  // ─── Initialize PeerManager & SyncEngine ──────────────────────────

  const initializePeer = useCallback(async (config: SyncConfig) => {
    // Clean up existing
    if (peerManagerRef.current) {
      peerManagerRef.current.destroy();
    }
    if (syncEngineRef.current) {
      syncEngineRef.current.stopListening();
    }

    if (!config.enabled || !config.deviceId) return;

    const peerManager = new PeerManager(config.deviceId, {
      onStatusChange: (status) => {
        setConnectionStatus(status);
        if (status === "connected") {
          // If we were waiting as initiator (no peerDeviceId yet), save the connection
          const currentConfig = getSyncConfig();
          if (!currentConfig.peerDeviceId && pairingPayloadRef.current) {
            // The responder connected to us – pairing complete from initiator side
            // We'll get the peer's device ID from the first sync message
          }
          // Request full sync on connection
          syncEngineRef.current?.requestFullSync();
          syncEngineRef.current?.flushPendingChanges();
        }
      },
      onMessage: (message) => {
        syncEngineRef.current?.handleMessage(message);
      },
      onError: (error) => {
        console.warn("[Sync]", error);
      },
    });

    const syncEngine = new SyncEngine(peerManager);
    syncEngine.setConflictResolver((c) => {
      if (conflictResolverRef.current) {
        return conflictResolverRef.current(c);
      }
      // Default: local wins
      return Promise.resolve(
        c.map((conflict) => ({
          target: conflict.target,
          itemId: conflict.itemId,
          resolution: "local" as const,
        })),
      );
    });

    peerManagerRef.current = peerManager;
    syncEngineRef.current = syncEngine;

    try {
      await peerManager.initialize(config.sharedSecret ?? undefined);
      syncEngine.startListening();

      // If already paired, auto-connect
      if (config.peerDeviceId) {
        peerManager.connectToPeer(config.peerDeviceId, config.sharedSecret ?? undefined);
      }
    } catch (err) {
      console.error("[Sync] Failed to initialize:", err);
      setConnectionStatus("error");
    }
  }, []);

  // Initialize on mount and when config changes
  useEffect(() => {
    if (syncConfig.enabled && syncConfig.deviceId) {
      initializePeer(syncConfig);
    }

    return () => {
      peerManagerRef.current?.destroy();
      syncEngineRef.current?.stopListening();
    };
  }, [syncConfig.enabled, syncConfig.deviceId, syncConfig.peerDeviceId]);

  // Visibility change: reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && syncConfig.enabled && syncConfig.peerDeviceId) {
        peerManagerRef.current?.attemptReconnect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [syncConfig.enabled, syncConfig.peerDeviceId]);

  // ─── Actions ──────────────────────────────────────────────────────

  const startPairing = useCallback(() => {
    let config = getSyncConfig();

    // Ensure we have a device ID
    if (!config.deviceId) {
      config = { ...config, deviceId: generateDeviceId(), enabled: true };
      saveSyncConfig(config);
      setSyncConfig(config);
    }

    // Generate a new secret for this pairing
    const secret = generateSecret();

    const payload: PairingPayload = {
      peerId: "eisenmate-" + config.deviceId,
      secret,
      deviceId: config.deviceId,
    };

    // Temporarily store the secret for when the responder connects
    const updatedConfig = {
      ...config,
      enabled: true,
      sharedSecret: secret,
    };
    saveSyncConfig(updatedConfig);
    setSyncConfig(updatedConfig);

    setPairingPayload(payload);

    // Initialize peer to accept incoming connection
    initializePeer(updatedConfig);
  }, [initializePeer]);

  const completePairing = useCallback(
    (payload: PairingPayload, role: "initiator" | "responder") => {
      const config = getSyncConfig();
      const updatedConfig: SyncConfig = {
        ...config,
        enabled: true,
        deviceId: config.deviceId || generateDeviceId(),
        peerDeviceId: payload.deviceId,
        sharedSecret: role === "responder" ? payload.secret : config.sharedSecret,
        lastSyncAt: null,
      };

      saveSyncConfig(updatedConfig);
      setSyncConfig(updatedConfig);
      setPairingPayload(null);

      // Initialize and connect
      initializePeer(updatedConfig);
    },
    [initializePeer],
  );

  const unpair = useCallback(() => {
    peerManagerRef.current?.destroy();
    syncEngineRef.current?.stopListening();

    const config = getSyncConfig();
    const updatedConfig: SyncConfig = {
      ...config,
      peerDeviceId: null,
      sharedSecret: null,
      lastSyncAt: null,
    };

    saveSyncConfig(updatedConfig);
    setSyncConfig(updatedConfig);
    setConnectionStatus("disconnected");
    setPairingPayload(null);
  }, []);

  const toggleSync = useCallback(
    (enabled: boolean) => {
      const config = getSyncConfig();
      const updatedConfig: SyncConfig = {
        ...config,
        enabled,
        deviceId: config.deviceId || (enabled ? generateDeviceId() : ""),
      };

      saveSyncConfig(updatedConfig);
      setSyncConfig(updatedConfig);

      if (!enabled) {
        peerManagerRef.current?.destroy();
        syncEngineRef.current?.stopListening();
        setConnectionStatus("disconnected");
      } else if (updatedConfig.peerDeviceId) {
        initializePeer(updatedConfig);
      }
    },
    [initializePeer],
  );

  const syncNow = useCallback(() => {
    syncEngineRef.current?.requestFullSync();
  }, []);

  const resolveConflicts = useCallback((resolutions: ResolvedConflict[]) => {
    setConflicts([]);
    if (pendingConflictResolveRef.current) {
      pendingConflictResolveRef.current(resolutions);
      pendingConflictResolveRef.current = null;
    }
  }, []);

  return {
    syncConfig,
    connectionStatus,
    isPaired: !!syncConfig.peerDeviceId,
    conflicts,
    pairingPayload,
    startPairing,
    completePairing,
    unpair,
    toggleSync,
    syncNow,
    resolveConflicts,
  };
}
