import Peer, { type DataConnection } from "peerjs";
import { encrypt, decrypt, secretToKey } from "./crypto";
import type { SyncMessage, ConnectionStatus } from "./sync-types";

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];
const PEERJS_PREFIX = "eisenmate-";

export interface PeerManagerEvents {
  onStatusChange: (status: ConnectionStatus) => void;
  onMessage: (message: SyncMessage) => void;
  onError: (error: string) => void;
}

/**
 * Manages a PeerJS connection with E2E encryption via NaCl secretbox.
 * Handles connection lifecycle, auto-reconnect, and encrypted messaging.
 */
export class PeerManager {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private encryptionKey: Uint8Array | null = null;
  private events: PeerManagerEvents;
  private deviceId: string;
  private peerDeviceId: string | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private _status: ConnectionStatus = "disconnected";

  constructor(deviceId: string, events: PeerManagerEvents) {
    this.deviceId = deviceId;
    this.events = events;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  get peerId(): string {
    return PEERJS_PREFIX + this.deviceId;
  }

  /**
   * Initialize the PeerJS peer and start listening for incoming connections.
   */
  async initialize(sharedSecret?: string): Promise<void> {
    if (this.destroyed) return;

    if (sharedSecret) {
      this.encryptionKey = secretToKey(sharedSecret);
    }

    return new Promise((resolve, reject) => {
      this.peer = new Peer(this.peerId, {
        debug: 0,
        config: {
          iceServers: [
            // Try local network first (no STUN), then fall back to public STUN
            { urls: "stun:stun.l.google.com:19302" },
          ],
        },
      });

      this.peer.on("open", () => {
        resolve();
      });

      this.peer.on("connection", (conn) => {
        this.handleIncomingConnection(conn);
      });

      this.peer.on("error", (err) => {
        const errorMsg = err.message || String(err);
        // "peer-unavailable" is expected when the other device is not online
        if (err.type === "peer-unavailable") {
          this.events.onError("Peer nicht erreichbar");
          this.scheduleReconnect();
        } else if (err.type === "unavailable-id") {
          // Our ID is taken – another tab/instance might be running
          this.events.onError("Gerät-ID bereits in Verwendung. Ist eine andere Instanz geöffnet?");
          reject(new Error(errorMsg));
        } else {
          this.events.onError(errorMsg);
          if (!this.connection) {
            reject(new Error(errorMsg));
          }
        }
      });

      this.peer.on("disconnected", () => {
        if (!this.destroyed) {
          // PeerJS server connection lost, try to reconnect
          this.peer?.reconnect();
        }
      });
    });
  }

  /**
   * Connect to a known peer device.
   */
  connectToPeer(peerDeviceId: string, sharedSecret?: string): void {
    if (this.destroyed || !this.peer) return;

    this.peerDeviceId = peerDeviceId;

    if (sharedSecret) {
      this.encryptionKey = secretToKey(sharedSecret);
    }

    this.setStatus("connecting");

    const conn = this.peer.connect(PEERJS_PREFIX + peerDeviceId, {
      reliable: true,
    });

    this.setupConnection(conn);
  }

  /**
   * Send an encrypted message to the connected peer.
   */
  send(message: SyncMessage): boolean {
    if (!this.connection || this.connection.open !== true || !this.encryptionKey) {
      return false;
    }

    try {
      const plaintext = JSON.stringify(message);
      const encrypted = encrypt(plaintext, this.encryptionKey);
      this.connection.send(encrypted);
      return true;
    } catch (err) {
      this.events.onError(`Senden fehlgeschlagen: ${err}`);
      return false;
    }
  }

  /**
   * Disconnect from the current peer (but keep PeerJS alive for reconnecting).
   */
  disconnect(): void {
    this.cancelReconnect();
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    this.setStatus("disconnected");
  }

  /**
   * Completely destroy the PeerJS instance. Cannot be reused after this.
   */
  destroy(): void {
    this.destroyed = true;
    this.cancelReconnect();
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.setStatus("disconnected");
  }

  /**
   * Attempt to reconnect to the previously connected peer.
   */
  attemptReconnect(): void {
    if (this.peerDeviceId && this.peer && !this.destroyed) {
      this.reconnectAttempt = 0;
      this.connectToPeer(this.peerDeviceId);
    }
  }

  // ─── Private ────────────────────────────────────────────────────────

  private handleIncomingConnection(conn: DataConnection): void {
    // If we already have a connection, close the old one
    if (this.connection) {
      this.connection.close();
    }
    this.setupConnection(conn);
  }

  private setupConnection(conn: DataConnection): void {
    this.connection = conn;

    conn.on("open", () => {
      this.reconnectAttempt = 0;
      this.cancelReconnect();
      this.setStatus("connected");
    });

    conn.on("data", (data) => {
      this.handleIncomingData(data);
    });

    conn.on("close", () => {
      if (this.connection === conn) {
        this.connection = null;
        this.setStatus("disconnected");
        this.scheduleReconnect();
      }
    });

    conn.on("error", (err) => {
      this.events.onError(`Verbindungsfehler: ${err.message || err}`);
      if (this.connection === conn) {
        this.connection = null;
        this.setStatus("error");
        this.scheduleReconnect();
      }
    });
  }

  private handleIncomingData(data: unknown): void {
    if (!this.encryptionKey) {
      this.events.onError("Kein Schlüssel – Nachricht ignoriert");
      return;
    }

    if (typeof data !== "string") {
      this.events.onError("Unerwartetes Datenformat");
      return;
    }

    try {
      const plaintext = decrypt(data, this.encryptionKey);
      const message = JSON.parse(plaintext) as SyncMessage;
      this.events.onMessage(message);
    } catch (err) {
      this.events.onError(`Entschlüsselung fehlgeschlagen: ${err}`);
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this._status !== status) {
      this._status = status;
      this.events.onStatusChange(status);
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed || !this.peerDeviceId) return;
    this.cancelReconnect();

    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(() => {
      if (!this.destroyed && this.peerDeviceId) {
        this.connectToPeer(this.peerDeviceId);
      }
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
