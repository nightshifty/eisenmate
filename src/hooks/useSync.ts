import { useState, useEffect, useCallback, useRef } from "react";
import { syncWithDrive, getLastSync, type SyncResult } from "@/lib/google-drive-sync";

export type SyncStatus = "idle" | "syncing" | "success" | "error";

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
  syncNow: () => Promise<void>;
}

const AUTO_SYNC_DEBOUNCE_MS = 5_000;
const SUCCESS_DISPLAY_MS = 3_000;

/**
 * Orchestrates sync with Google Drive.
 *
 * - Syncs automatically on mount (if signed in)
 * - Syncs on visibilitychange (tab/app re-focus)
 * - Provides a manual `syncNow` trigger
 * - Debounces rapid sync requests
 */
export function useSync(isSignedIn: boolean): SyncState {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => getLastSync());
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncing = useRef(false);

  const performSync = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    setStatus("syncing");
    setError(null);

    const result: SyncResult = await syncWithDrive();

    if (result.status === "success" || result.status === "no-change") {
      setStatus("success");
      setLastSyncedAt(result.timestamp);
      setError(null);
      // Reset status to idle after a short display period
      setTimeout(() => {
        setStatus((prev) => (prev === "success" ? "idle" : prev));
      }, SUCCESS_DISPLAY_MS);
    } else {
      setStatus("error");
      setError(result.message);
    }

    isSyncing.current = false;
  }, []);

  const syncNow = useCallback(async () => {
    if (!isSignedIn) return;
    // Clear any pending debounce
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    await performSync();
  }, [isSignedIn, performSync]);

  /** Debounced auto-sync trigger. */
  const scheduleSync = useCallback(() => {
    if (!isSignedIn || isSyncing.current) return;
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      performSync();
    }, AUTO_SYNC_DEBOUNCE_MS);
  }, [isSignedIn, performSync]);

  // Auto-sync on mount when signed in
  useEffect(() => {
    if (isSignedIn) {
      performSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Sync when tab regains focus
  useEffect(() => {
    if (!isSignedIn) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleSync();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [isSignedIn, scheduleSync]);

  // Sync when localStorage data changes (from mutations in other hooks)
  useEffect(() => {
    if (!isSignedIn) return;

    const onStorageWrite = () => {
      scheduleSync();
    };

    // Listen for local mutations (same tab)
    window.addEventListener("eisenmate-data-changed", onStorageWrite);
    return () => window.removeEventListener("eisenmate-data-changed", onStorageWrite);
  }, [isSignedIn, scheduleSync]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return { status, lastSyncedAt, error, syncNow };
}
