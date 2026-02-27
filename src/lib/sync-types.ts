import type { Todo, Session, UserSettings } from "./storage";

// ─── Sync Configuration (persisted in localStorage) ─────────────────────────

export interface SyncConfig {
  enabled: boolean;
  deviceId: string;
  peerDeviceId: string | null;
  sharedSecret: string | null;
  lastSyncAt: number | null;
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  enabled: false,
  deviceId: "",
  peerDeviceId: null,
  sharedSecret: null,
  lastSyncAt: null,
};

// ─── Connection State ────────────────────────────────────────────────────────

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

// ─── Sync Messages (sent over WebRTC Data Channel) ──────────────────────────

export interface FullSyncRequest {
  type: "full-sync-request";
  timestamp: number;
  data: SyncPayload;
}

export interface FullSyncResponse {
  type: "full-sync-response";
  timestamp: number;
  data: SyncPayload;
  conflicts: SyncConflict[];
}

export interface IncrementalUpdate {
  type: "incremental-update";
  timestamp: number;
  changes: SyncChange[];
}

export interface Ack {
  type: "ack";
  timestamp: number;
  forTimestamp: number;
}

export interface ChallengeRequest {
  type: "challenge-request";
  nonce: string;
}

export interface ChallengeResponse {
  type: "challenge-response";
  proof: string;
}

export interface ConflictResolution {
  type: "conflict-resolution";
  resolutions: ResolvedConflict[];
}

export type SyncMessage =
  | FullSyncRequest
  | FullSyncResponse
  | IncrementalUpdate
  | Ack
  | ChallengeRequest
  | ChallengeResponse
  | ConflictResolution;

// ─── Sync Data Structures ───────────────────────────────────────────────────

export interface SyncPayload {
  todos: Todo[];
  sessions: Session[];
  settings: UserSettings & { updatedAt: number };
}

export type SyncChangeTarget = "todos" | "sessions" | "settings";

export interface SyncChange {
  target: SyncChangeTarget;
  action: "add" | "update" | "delete";
  timestamp: number;
  itemId?: string;
  data: unknown;
}

export interface SyncConflict {
  target: SyncChangeTarget;
  itemId: string;
  localVersion: unknown;
  remoteVersion: unknown;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
}

export interface ResolvedConflict {
  target: SyncChangeTarget;
  itemId: string;
  resolution: "local" | "remote";
}

// ─── Pairing Data (encoded in QR code) ──────────────────────────────────────

export interface PairingPayload {
  /** PeerJS peer ID of the initiator */
  peerId: string;
  /** Shared secret for E2E encryption (base64) */
  secret: string;
  /** Device ID of the initiator */
  deviceId: string;
}

// ─── Storage Change Event ───────────────────────────────────────────────────

export interface StorageChangeDetail {
  key: string;
  timestamp: number;
  source: "local" | "sync";
}

export const STORAGE_CHANGE_EVENT = "eisenmate-storage-change";
export const SYNC_UPDATE_EVENT = "eisenmate-sync-update";
