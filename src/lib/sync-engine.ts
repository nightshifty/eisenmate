import {
  getTodos,
  saveTodos,
  getSessions,
  saveSessions,
  getSettings,
  saveSettings,
  getSyncConfig,
  saveSyncConfig,
  STORAGE_KEYS,
  type Todo,
  type Session,
  type UserSettings,
} from "./storage";
import {
  STORAGE_CHANGE_EVENT,
  SYNC_UPDATE_EVENT,
  type SyncMessage,
  type SyncPayload,
  type SyncConflict,
  type SyncChange,
  type ResolvedConflict,
  type StorageChangeDetail,
} from "./sync-types";
import { PeerManager } from "./peer-manager";

export type ConflictResolver = (conflicts: SyncConflict[]) => Promise<ResolvedConflict[]>;

/**
 * Orchestrates data synchronization between two peers.
 * Listens for local storage changes and sends incremental updates.
 * Handles incoming full-sync and incremental messages.
 */
export class SyncEngine {
  private peerManager: PeerManager;
  private conflictResolver: ConflictResolver | null = null;
  private storageListener: ((e: Event) => void) | null = null;
  private pendingChanges: SyncChange[] = [];
  public isSyncing = false;

  constructor(peerManager: PeerManager) {
    this.peerManager = peerManager;
  }

  /**
   * Set the conflict resolver callback (usually wired to a UI dialog).
   */
  setConflictResolver(resolver: ConflictResolver): void {
    this.conflictResolver = resolver;
  }

  /**
   * Start listening for local storage changes and forwarding them as incremental updates.
   */
  startListening(): void {
    this.stopListening();
    this.storageListener = (e: Event) => {
      const detail = (e as CustomEvent<StorageChangeDetail>).detail;
      // Don't echo back changes that came from sync
      if (detail.source === "sync") return;
      this.handleLocalChange(detail);
    };
    window.addEventListener(STORAGE_CHANGE_EVENT, this.storageListener);
  }

  /**
   * Stop listening for local changes.
   */
  stopListening(): void {
    if (this.storageListener) {
      window.removeEventListener(STORAGE_CHANGE_EVENT, this.storageListener);
      this.storageListener = null;
    }
  }

  /**
   * Handle an incoming sync message from the peer.
   */
  async handleMessage(message: SyncMessage): Promise<void> {
    switch (message.type) {
      case "full-sync-request":
        await this.handleFullSyncRequest(message.data, message.timestamp);
        break;
      case "full-sync-response":
        await this.applyFullSyncResponse(message.data, message.conflicts);
        break;
      case "incremental-update":
        this.applyIncrementalUpdate(message.changes);
        break;
      case "conflict-resolution":
        this.applyConflictResolutions(message.resolutions);
        break;
      case "ack":
        // Acknowledged – could be used for delivery confirmation
        break;
    }
  }

  /**
   * Initiate a full sync with the peer. Called after connection is established.
   */
  requestFullSync(): void {
    const payload = this.buildSyncPayload();
    this.peerManager.send({
      type: "full-sync-request",
      timestamp: Date.now(),
      data: payload,
    });
  }

  /**
   * Flush any pending changes that were queued while offline.
   */
  flushPendingChanges(): void {
    if (this.pendingChanges.length === 0) return;

    const changes = [...this.pendingChanges];
    this.pendingChanges = [];

    const sent = this.peerManager.send({
      type: "incremental-update",
      timestamp: Date.now(),
      changes,
    });

    if (!sent) {
      // Put them back if send failed
      this.pendingChanges = [...changes, ...this.pendingChanges];
    }
  }

  // ─── Full Sync ──────────────────────────────────────────────────────

  private async handleFullSyncRequest(remoteData: SyncPayload, _remoteTimestamp: number): Promise<void> {
    this.isSyncing = true;
    try {
      const localData = this.buildSyncPayload();
      const { merged, conflicts } = this.mergePayloads(localData, remoteData);

      // Apply merged data locally
      this.applyMergedData(merged);

      // Send response with our data + detected conflicts
      this.peerManager.send({
        type: "full-sync-response",
        timestamp: Date.now(),
        data: merged,
        conflicts,
      });

      // If there are conflicts, ask the user
      if (conflicts.length > 0 && this.conflictResolver) {
        const resolutions = await this.conflictResolver(conflicts);
        this.applyConflictResolutions(resolutions);
        this.peerManager.send({
          type: "conflict-resolution",
          resolutions,
        });
      }

      this.updateLastSyncTime();
    } finally {
      this.isSyncing = false;
    }
  }

  private async applyFullSyncResponse(remoteData: SyncPayload, conflicts: SyncConflict[]): Promise<void> {
    this.isSyncing = true;
    try {
      // The response already contains the merged data from the peer's perspective
      this.applyMergedData(remoteData);

      // Handle any conflicts the peer detected
      if (conflicts.length > 0 && this.conflictResolver) {
        const resolutions = await this.conflictResolver(conflicts);
        this.applyConflictResolutions(resolutions);
        this.peerManager.send({
          type: "conflict-resolution",
          resolutions,
        });
      }

      this.updateLastSyncTime();
    } finally {
      this.isSyncing = false;
    }
  }

  // ─── Incremental Sync ───────────────────────────────────────────────

  private handleLocalChange(detail: StorageChangeDetail): void {
    const changes = this.buildChangesFromStorageKey(detail.key, detail.timestamp);
    if (changes.length === 0) return;

    const sent = this.peerManager.send({
      type: "incremental-update",
      timestamp: Date.now(),
      changes,
    });

    if (!sent) {
      // Queue for later
      this.pendingChanges.push(...changes);
    }
  }

  private applyIncrementalUpdate(changes: SyncChange[]): void {
    this.isSyncing = true;
    try {
      for (const change of changes) {
        switch (change.target) {
          case "todos":
            this.applyTodoChange(change);
            break;
          case "sessions":
            this.applySessionChange(change);
            break;
          case "settings":
            this.applySettingsChange(change);
            break;
        }
      }
      this.updateLastSyncTime();
      this.dispatchSyncUpdate();
    } finally {
      this.isSyncing = false;
    }
  }

  // ─── Merge Logic ────────────────────────────────────────────────────

  private mergePayloads(
    local: SyncPayload,
    remote: SyncPayload,
  ): { merged: SyncPayload; conflicts: SyncConflict[] } {
    const conflicts: SyncConflict[] = [];

    // Merge todos (per-item by ID)
    const mergedTodos = this.mergeTodos(local.todos, remote.todos, conflicts);

    // Merge sessions (union by ID, append-only)
    const mergedSessions = this.mergeSessions(local.sessions, remote.sessions);

    // Merge settings (last-write-wins, but flag conflict if close timestamps)
    const mergedSettings = this.mergeSettings(local.settings, remote.settings, conflicts);

    return {
      merged: {
        todos: mergedTodos,
        sessions: mergedSessions,
        settings: mergedSettings,
      },
      conflicts,
    };
  }

  private mergeTodos(local: Todo[], remote: Todo[], conflicts: SyncConflict[]): Todo[] {
    const localMap = new Map(local.map((t) => [t.id, t]));
    const remoteMap = new Map(remote.map((t) => [t.id, t]));
    const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
    const merged: Todo[] = [];

    for (const id of allIds) {
      const localTodo = localMap.get(id);
      const remoteTodo = remoteMap.get(id);

      if (localTodo && !remoteTodo) {
        // Only exists locally
        merged.push(localTodo);
      } else if (!localTodo && remoteTodo) {
        // Only exists remotely
        merged.push(remoteTodo);
      } else if (localTodo && remoteTodo) {
        // Exists in both – compare updatedAt
        const localTime = localTodo.updatedAt ?? 0;
        const remoteTime = remoteTodo.updatedAt ?? 0;

        // Check if both were modified and content differs
        const contentDiffers =
          localTodo.content !== remoteTodo.content ||
          localTodo.done !== remoteTodo.done ||
          localTodo.estimationMinutes !== remoteTodo.estimationMinutes ||
          localTodo.quadrant !== remoteTodo.quadrant;

        if (contentDiffers && Math.abs(localTime - remoteTime) < 5000) {
          // Close timestamps with different content → conflict
          conflicts.push({
            target: "todos",
            itemId: id,
            localVersion: localTodo,
            remoteVersion: remoteTodo,
            localUpdatedAt: localTime,
            remoteUpdatedAt: remoteTime,
          });
          // Temporarily use local version; conflict resolution will fix it
          merged.push(localTodo);
        } else {
          // Use the newer version
          merged.push(localTime >= remoteTime ? localTodo : remoteTodo);
        }
      }
    }

    return merged;
  }

  private mergeSessions(local: Session[], remote: Session[]): Session[] {
    const localMap = new Map(local.map((s) => [s.id, s]));
    for (const remoteSession of remote) {
      if (!localMap.has(remoteSession.id)) {
        localMap.set(remoteSession.id, remoteSession);
      }
    }
    // Sort by completedAt descending (newest first)
    return Array.from(localMap.values()).sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
  }

  private mergeSettings(
    local: UserSettings & { updatedAt: number },
    remote: UserSettings & { updatedAt: number },
    conflicts: SyncConflict[],
  ): UserSettings & { updatedAt: number } {
    const localTime = local.updatedAt ?? 0;
    const remoteTime = remote.updatedAt ?? 0;

    // Check if settings actually differ
    const differs =
      local.pomodoroMinutes !== remote.pomodoroMinutes ||
      local.breakMinutes !== remote.breakMinutes ||
      local.overtimeMaxMinutes !== remote.overtimeMaxMinutes ||
      local.overtimeChimeIntervalMinutes !== remote.overtimeChimeIntervalMinutes ||
      local.allowEarlyFinish !== remote.allowEarlyFinish ||
      local.sessionTimerEnabled !== remote.sessionTimerEnabled;
    // Note: silentMode is intentionally NOT compared – it's device-local

    if (differs && Math.abs(localTime - remoteTime) < 5000) {
      conflicts.push({
        target: "settings",
        itemId: "settings",
        localVersion: local,
        remoteVersion: remote,
        localUpdatedAt: localTime,
        remoteUpdatedAt: remoteTime,
      });
      return local;
    }

    // Keep silentMode from local regardless
    const winner = localTime >= remoteTime ? local : remote;
    return { ...winner, silentMode: local.silentMode };
  }

  // ─── Apply Changes ──────────────────────────────────────────────────

  private applyMergedData(data: SyncPayload): void {
    saveTodos(data.todos, "sync");
    saveSessions(data.sessions, "sync");
    // Preserve local silentMode
    const currentSettings = getSettings();
    saveSettings({ ...data.settings, silentMode: currentSettings.silentMode }, "sync");
    this.dispatchSyncUpdate();
  }

  private applyTodoChange(change: SyncChange): void {
    const todos = getTodos();

    switch (change.action) {
      case "add": {
        const newTodo = change.data as Todo;
        if (!todos.find((t) => t.id === newTodo.id)) {
          saveTodos([newTodo, ...todos], "sync");
        }
        break;
      }
      case "update": {
        const updatedTodo = change.data as Todo;
        const idx = todos.findIndex((t) => t.id === updatedTodo.id);
        if (idx >= 0) {
          // Only apply if remote is newer
          if ((updatedTodo.updatedAt ?? 0) > (todos[idx].updatedAt ?? 0)) {
            const updated = [...todos];
            updated[idx] = updatedTodo;
            saveTodos(updated, "sync");
          }
        } else {
          // Todo doesn't exist locally – add it
          saveTodos([updatedTodo, ...todos], "sync");
        }
        break;
      }
      case "delete": {
        if (change.itemId) {
          const filtered = todos.filter((t) => t.id !== change.itemId);
          if (filtered.length !== todos.length) {
            saveTodos(filtered, "sync");
          }
        }
        break;
      }
    }
  }

  private applySessionChange(change: SyncChange): void {
    const sessions = getSessions();

    switch (change.action) {
      case "add": {
        const newSession = change.data as Session;
        if (!sessions.find((s) => s.id === newSession.id)) {
          const updated = [newSession, ...sessions].sort(
            (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
          );
          saveSessions(updated, "sync");
        }
        break;
      }
      case "delete": {
        if (change.itemId) {
          const filtered = sessions.filter((s) => s.id !== change.itemId);
          if (filtered.length !== sessions.length) {
            saveSessions(filtered, "sync");
          }
        }
        break;
      }
    }
  }

  private applySettingsChange(change: SyncChange): void {
    if (change.action === "update") {
      const remoteSettings = change.data as UserSettings;
      const localSettings = getSettings();
      // Only apply if remote is newer
      if ((remoteSettings.updatedAt ?? 0) > (localSettings.updatedAt ?? 0)) {
        saveSettings(
          { ...remoteSettings, silentMode: localSettings.silentMode },
          "sync",
        );
      }
    }
  }

  private applyConflictResolutions(_resolutions: ResolvedConflict[]): void {
    // The conflict was already stored with both versions.
    // Resolution was applied when the user made their choice in the dialog.
    // The peer sends this so the other side knows which version won.
    // For now, we just trigger a UI refresh.
    this.dispatchSyncUpdate();
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private buildSyncPayload(): SyncPayload {
    return {
      todos: getTodos(),
      sessions: getSessions(),
      settings: getSettings(),
    };
  }

  private buildChangesFromStorageKey(key: string, timestamp: number): SyncChange[] {
    switch (key) {
      case STORAGE_KEYS.todos:
        return [{
          target: "todos",
          action: "update",
          timestamp,
          data: getTodos(),
        }];
      case STORAGE_KEYS.sessions:
        return [{
          target: "sessions",
          action: "update",
          timestamp,
          data: getSessions(),
        }];
      case STORAGE_KEYS.settings:
        return [{
          target: "settings",
          action: "update",
          timestamp,
          data: getSettings(),
        }];
      default:
        return [];
    }
  }

  private updateLastSyncTime(): void {
    const config = getSyncConfig();
    saveSyncConfig({ ...config, lastSyncAt: Date.now() });
  }

  private dispatchSyncUpdate(): void {
    window.dispatchEvent(new CustomEvent(SYNC_UPDATE_EVENT));
  }
}
