import { syncWithDrive, getLastSync } from "./google-drive-sync";
import {
  saveTodos,
  saveSessions,
  getTodos,
  getSessions,
  getSettings,
  getTimerState,
  getSessionTimerState,
  setLastSyncedAt,
  saveGoogleToken,
  addDeletedSessionId,
  type Todo,
  type Session,
  type ExportData,
} from "./storage";

// ---------------------------------------------------------------------------
// Mock google-auth so we don't need GIS
// ---------------------------------------------------------------------------

vi.mock("./google-auth", () => ({
  getValidAccessToken: vi.fn().mockResolvedValue("ya29.mock-token"),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: "todo-1",
  content: "Test task",
  estimationMinutes: 25,
  timeSpentMinutes: 0,
  done: false,
  createdAt: "2025-06-01T00:00:00.000Z",
  completedAt: null,
  quadrant: null,
  updatedAt: "2025-06-01T00:00:00.000Z",
  ...overrides,
});

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: "sess-1",
  todoId: "todo-1",
  todoContent: "Test task",
  durationMinutes: 25,
  completedAt: "2025-06-01T00:30:00.000Z",
  updatedAt: "2025-06-01T00:30:00.000Z",
  ...overrides,
});

function makeExportData(overrides: Partial<ExportData["data"]> = {}): ExportData {
  return {
    version: 1,
    app: "eisenmate",
    exportedAt: "2025-06-01T00:00:00.000Z",
    data: {
      todos: [],
      sessions: [],
      settings: getSettings(),
      theme: "light",
      ...overrides,
    },
  };
}

/** Track all fetch calls with their URLs */
let fetchCalls: Array<{ url: string; method?: string; body?: string }> = [];

function mockDriveApi(options: {
  findFileId?: string | null;
  remoteData?: ExportData | null;
  uploadFails?: boolean;
} = {}) {
  const { findFileId = null, remoteData = null, uploadFails = false } = options;

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const method = init?.method ?? "GET";
    fetchCalls.push({ url, method, body: init?.body as string | undefined });

    // List files in appDataFolder
    if (url.includes("drive/v3/files") && !url.includes("upload") && method === "GET" && !url.includes("alt=media")) {
      const files = findFileId ? [{ id: findFileId, name: "eisenmate-sync.json" }] : [];
      return new Response(JSON.stringify({ files }), { status: 200 });
    }

    // Download file content
    if (url.includes("alt=media") && method === "GET") {
      if (!remoteData) {
        return new Response("Not found", { status: 404 });
      }
      return new Response(JSON.stringify(remoteData), { status: 200 });
    }

    // Upload (PATCH = update existing)
    if (url.includes("upload/drive/v3/files") && method === "PATCH") {
      if (uploadFails) return new Response("Error", { status: 500 });
      return new Response(JSON.stringify({ id: findFileId }), { status: 200 });
    }

    // Upload (POST = create new)
    if (url.includes("upload/drive/v3/files") && method === "POST") {
      if (uploadFails) return new Response("Error", { status: 500 });
      return new Response(JSON.stringify({ id: "new-file-id" }), { status: 200 });
    }

    return new Response("Unknown endpoint", { status: 404 });
  });
}

beforeEach(() => {
  localStorage.clear();
  fetchCalls = [];
  vi.restoreAllMocks();
  // Ensure we have a valid token
  saveGoogleToken({ accessToken: "ya29.mock-token", expiresAt: Date.now() + 3600000, email: "test@test.com" });
});

// ---------------------------------------------------------------------------
// syncWithDrive
// ---------------------------------------------------------------------------

describe("syncWithDrive — first sync (no remote file)", () => {
  it("creates a new file on Drive when none exists", async () => {
    saveTodos([makeTodo()]);
    mockDriveApi({ findFileId: null });

    const result = await syncWithDrive();

    expect(result.status).toBe("success");
    expect(fetchCalls.some((c) => c.method === "POST")).toBe(true);
  });

  it("uploads local data", async () => {
    saveTodos([makeTodo({ id: "local-1" })]);
    saveSessions([makeSession({ id: "local-s1" })]);
    mockDriveApi({ findFileId: null });

    const result = await syncWithDrive();

    expect(result.status).toBe("success");
    // Verify the upload POST was made
    const uploadCall = fetchCalls.find((c) => c.method === "POST");
    expect(uploadCall).toBeTruthy();
  });

  it("sets lastSyncedAt timestamp", async () => {
    mockDriveApi({ findFileId: null });

    const result = await syncWithDrive();

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.timestamp).toBeTruthy();
      expect(getLastSync()).toBe(result.timestamp);
    }
  });
});

describe("syncWithDrive — sync with existing remote file", () => {
  it("merges remote todos into local", async () => {
    // Local has todo-local
    saveTodos([makeTodo({ id: "local-1", content: "Local" })]);

    // Remote has todo-remote
    const remoteData = makeExportData({
      todos: [makeTodo({ id: "remote-1", content: "Remote" })],
    });
    mockDriveApi({ findFileId: "file-123", remoteData });

    const result = await syncWithDrive();

    expect(result.status).toBe("success");
    const todos = getTodos();
    expect(todos).toHaveLength(2);
    expect(todos.map((t) => t.id).sort()).toEqual(["local-1", "remote-1"]);
  });

  it("merges remote sessions into local", async () => {
    saveSessions([makeSession({ id: "local-s1" })]);

    const remoteData = makeExportData({
      sessions: [makeSession({ id: "remote-s1" })],
    });
    mockDriveApi({ findFileId: "file-123", remoteData });

    await syncWithDrive();

    const sessions = getSessions();
    expect(sessions).toHaveLength(2);
  });

  it("uses last-write-wins for conflicting todos", async () => {
    saveTodos([makeTodo({ id: "shared", content: "Old local", updatedAt: "2025-06-01T00:00:00.000Z" })]);

    const remoteData = makeExportData({
      todos: [makeTodo({ id: "shared", content: "Newer remote", updatedAt: "2025-06-02T00:00:00.000Z" })],
    });
    mockDriveApi({ findFileId: "file-123", remoteData });

    await syncWithDrive();

    expect(getTodos()[0].content).toBe("Newer remote");
  });

  it("keeps local version when local is newer", async () => {
    saveTodos([makeTodo({ id: "shared", content: "Newer local", updatedAt: "2025-06-03T00:00:00.000Z" })]);

    const remoteData = makeExportData({
      todos: [makeTodo({ id: "shared", content: "Old remote", updatedAt: "2025-06-01T00:00:00.000Z" })],
    });
    mockDriveApi({ findFileId: "file-123", remoteData });

    await syncWithDrive();

    expect(getTodos()[0].content).toBe("Newer local");
  });

  it("applies remote tombstones to remove local items", async () => {
    saveTodos([makeTodo({ id: "deleted-on-remote" })]);

    const remoteData = makeExportData({
      deletedTodoIds: [{ id: "deleted-on-remote", deletedAt: "2025-06-02T00:00:00.000Z" }],
    });
    mockDriveApi({ findFileId: "file-123", remoteData });

    await syncWithDrive();

    expect(getTodos()).toHaveLength(0);
  });

  it("applies local tombstones to remote items", async () => {
    saveTodos([]);
    addDeletedSessionId("deleted-locally");

    const remoteData = makeExportData({
      sessions: [makeSession({ id: "deleted-locally" })],
    });
    mockDriveApi({ findFileId: "file-123", remoteData });

    await syncWithDrive();

    expect(getSessions()).toHaveLength(0);
  });

  it("imports remote timer state when no local timer is running", async () => {
    const remoteTimer = { status: "running" as const, endTime: Date.now() + 60000, pomodoroMinutes: 25, activeTodoId: null };
    const remoteData = makeExportData({ timerState: remoteTimer });
    mockDriveApi({ findFileId: "file-123", remoteData });

    await syncWithDrive();

    const localTimer = getTimerState();
    expect(localTimer).not.toBeNull();
    expect(localTimer?.status).toBe("running");
  });

  it("imports remote session timer state when no local session is running", async () => {
    const remoteSessionTimer = {
      startTime: Date.now() - 600000,
      pomodoroCount: 2,
      focusMinutes: 50,
      longestPomodoroMinutes: 25,
      todoNames: ["Task A"],
      sessionSessions: [],
    };
    const remoteData = makeExportData({ sessionTimerState: remoteSessionTimer });
    mockDriveApi({ findFileId: "file-123", remoteData });

    await syncWithDrive();

    const localSessionTimer = getSessionTimerState();
    expect(localSessionTimer).not.toBeNull();
    expect(localSessionTimer?.pomodoroCount).toBe(2);
  });

  it("updates existing file via PATCH", async () => {
    mockDriveApi({ findFileId: "file-123", remoteData: makeExportData() });

    await syncWithDrive();

    expect(fetchCalls.some((c) => c.method === "PATCH")).toBe(true);
  });
});

describe("syncWithDrive — error handling", () => {
  it("returns error when upload fails", async () => {
    mockDriveApi({ findFileId: "file-123", remoteData: makeExportData(), uploadFails: true });

    const result = await syncWithDrive();

    expect(result.status).toBe("error");
  });

  it("returns error when not signed in", async () => {
    const { getValidAccessToken } = await import("./google-auth");
    vi.mocked(getValidAccessToken).mockRejectedValueOnce(new Error("Not signed in"));

    const result = await syncWithDrive();

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.message).toBe("Not signed in");
    }
  });

  it("handles invalid remote data gracefully", async () => {
    // Mock fetch to return invalid JSON for the file download
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
      if (url.includes("drive/v3/files") && !url.includes("upload") && !url.includes("alt=media")) {
        return new Response(JSON.stringify({ files: [{ id: "file-123", name: "eisenmate-sync.json" }] }), { status: 200 });
      }
      if (url.includes("alt=media")) {
        return new Response(JSON.stringify({ invalid: "data" }), { status: 200 });
      }
      // For upload
      return new Response(JSON.stringify({ id: "file-123" }), { status: 200 });
    });

    const result = await syncWithDrive();

    // Should still succeed (invalid remote data is ignored)
    expect(result.status).toBe("success");
  });
});

// ---------------------------------------------------------------------------
// getLastSync
// ---------------------------------------------------------------------------

describe("getLastSync", () => {
  it("returns null when no sync has occurred", () => {
    expect(getLastSync()).toBeNull();
  });

  it("returns the timestamp after sync", () => {
    setLastSyncedAt("2025-06-01T12:00:00.000Z");
    expect(getLastSync()).toBe("2025-06-01T12:00:00.000Z");
  });
});
