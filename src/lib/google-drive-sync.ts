import {
  exportAllData,
  importAllData,
  validateExportData,
  setLastSyncedAt,
  getLastSyncedAt,
  dispatchSyncComplete,
  suppressDataChangedEvents,
  type ExportData,
} from "./storage";
import { getValidAccessToken } from "./google-auth";

const SYNC_FILE_NAME = "eisenmate-sync.json";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type SyncResult =
  | { status: "success"; timestamp: string }
  | { status: "no-change"; timestamp: string }
  | { status: "error"; message: string };

/**
 * Full sync cycle:
 * 1. Download remote data (if any)
 * 2. Merge local + remote using last-write-wins
 * 3. Upload merged result to Drive
 * 4. Update lastSyncedAt
 */
export async function syncWithDrive(): Promise<SyncResult> {
  try {
    const token = await getValidAccessToken();

    // 1. Try to download existing remote data
    const remote = await downloadFromDrive(token);

    // 2. If remote exists, merge into local (suppress data-changed to avoid re-trigger)
    if (remote) {
      suppressDataChangedEvents(() => {
        importAllData(remote, "merge");
      });
    }

    // 3. Export current (merged) local data and upload
    const localData = exportAllData();
    await uploadToDrive(token, localData);

    // 4. Update sync timestamp
    const timestamp = new Date().toISOString();
    setLastSyncedAt(timestamp);

    // 5. Notify hooks to refresh from localStorage
    dispatchSyncComplete();

    return { status: "success", timestamp };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return { status: "error", message };
  }
}

/** Get the last successful sync timestamp. */
export function getLastSync(): string | null {
  return getLastSyncedAt();
}

// ---------------------------------------------------------------------------
// Google Drive REST API helpers
// ---------------------------------------------------------------------------

/**
 * Find the sync file in the appDataFolder.
 * Returns the file ID or null if not found.
 */
async function findSyncFile(token: string): Promise<string | null> {
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    q: `name = '${SYNC_FILE_NAME}'`,
    fields: "files(id,name)",
    pageSize: "1",
  });

  const resp = await fetch(`${DRIVE_API}/files?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    throw new Error(`Drive API list failed: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  const files = data.files as Array<{ id: string; name: string }>;
  return files.length > 0 ? files[0].id : null;
}

/**
 * Download the sync file from appDataFolder.
 * Returns null if no file exists yet.
 */
async function downloadFromDrive(token: string): Promise<ExportData | null> {
  const fileId = await findSyncFile(token);
  if (!fileId) return null;

  const resp = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    throw new Error(`Drive API download failed: ${resp.status} ${resp.statusText}`);
  }

  const raw = await resp.json();
  if (!validateExportData(raw)) {
    // Remote data is corrupted — treat as no remote data
    console.warn("Remote sync data is invalid, ignoring");
    return null;
  }

  return raw;
}

/**
 * Upload (create or update) the sync file in appDataFolder.
 */
async function uploadToDrive(token: string, data: ExportData): Promise<void> {
  const fileId = await findSyncFile(token);
  const json = JSON.stringify(data);

  if (fileId) {
    // Update existing file
    const resp = await fetch(`${UPLOAD_API}/files/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: json,
    });

    if (!resp.ok) {
      throw new Error(`Drive API upload (update) failed: ${resp.status} ${resp.statusText}`);
    }
  } else {
    // Create new file in appDataFolder
    const metadata = {
      name: SYNC_FILE_NAME,
      parents: ["appDataFolder"],
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    );
    form.append(
      "file",
      new Blob([json], { type: "application/json" }),
    );

    const resp = await fetch(`${UPLOAD_API}/files?uploadType=multipart`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (!resp.ok) {
      throw new Error(`Drive API upload (create) failed: ${resp.status} ${resp.statusText}`);
    }
  }
}
