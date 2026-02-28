import {
  waitForGis,
  initGoogleAuth,
  signIn,
  refreshToken,
  signOut,
  getValidAccessToken,
  isSignedIn,
  _resetForTesting,
} from "./google-auth";
import { saveGoogleToken, clearGoogleToken, getGoogleToken } from "./storage";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Captured callback/error_callback from initTokenClient. */
let capturedCallback: ((resp: Record<string, unknown>) => void) | null = null;
let capturedErrorCallback: ((err: { type: string; message: string }) => void) | null = null;
let mockRequestAccessToken: ReturnType<typeof vi.fn>;

function installGisMock() {
  mockRequestAccessToken = vi.fn();
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: vi.fn((config) => {
          capturedCallback = config.callback;
          capturedErrorCallback = config.error_callback ?? null;
          return { requestAccessToken: mockRequestAccessToken };
        }),
        revoke: vi.fn((_token, cb) => cb?.()),
      },
    },
  } as unknown as typeof window.google;
}

function removeGisMock() {
  delete window.google;
}

beforeEach(() => {
  localStorage.clear();
  _resetForTesting();
  removeGisMock();
  capturedCallback = null;
  capturedErrorCallback = null;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// waitForGis
// ---------------------------------------------------------------------------

describe("waitForGis", () => {
  it("resolves immediately when google.accounts is present", async () => {
    installGisMock();
    await expect(waitForGis()).resolves.toBeUndefined();
  });

  it("resolves when google.accounts appears within timeout", async () => {
    // Simulate GIS loading after 200ms
    setTimeout(() => installGisMock(), 200);
    await expect(waitForGis(5000)).resolves.toBeUndefined();
  });

  it("rejects when timeout expires", async () => {
    await expect(waitForGis(200)).rejects.toThrow("Google Identity Services failed to load");
  });
});

// ---------------------------------------------------------------------------
// initGoogleAuth
// ---------------------------------------------------------------------------

describe("initGoogleAuth", () => {
  it("initializes the token client", async () => {
    installGisMock();
    await initGoogleAuth();
    expect(window.google!.accounts.oauth2.initTokenClient).toHaveBeenCalledTimes(1);
  });

  it("does not re-initialize if called twice", async () => {
    installGisMock();
    await initGoogleAuth();
    await initGoogleAuth();
    expect(window.google!.accounts.oauth2.initTokenClient).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// signIn
// ---------------------------------------------------------------------------

describe("signIn", () => {
  it("rejects when not initialized", async () => {
    await expect(signIn()).rejects.toThrow("Google auth not initialized");
  });

  it("calls requestAccessToken with consent prompt", async () => {
    installGisMock();
    await initGoogleAuth();

    // Mock the email fetch
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ email: "user@test.com" }), { status: 200 }),
    );

    const promise = signIn();
    expect(mockRequestAccessToken).toHaveBeenCalledWith({ prompt: "consent" });

    // Simulate GIS callback
    capturedCallback!({ access_token: "ya29.abc", expires_in: 3600, scope: "", token_type: "Bearer" });

    const result = await promise;
    expect(result.accessToken).toBe("ya29.abc");
    expect(result.email).toBe("user@test.com");
    expect(getGoogleToken()?.accessToken).toBe("ya29.abc");
  });

  it("resolves with empty email when email fetch fails", async () => {
    installGisMock();
    await initGoogleAuth();

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));

    const promise = signIn();
    capturedCallback!({ access_token: "ya29.abc", expires_in: 3600, scope: "", token_type: "Bearer" });

    const result = await promise;
    expect(result.accessToken).toBe("ya29.abc");
    expect(result.email).toBe("");
  });

  it("rejects when GIS returns an error", async () => {
    installGisMock();
    await initGoogleAuth();

    const promise = signIn();
    capturedCallback!({ error: "access_denied", error_description: "User denied" });

    await expect(promise).rejects.toThrow("User denied");
  });

  it("rejects when error_callback fires", async () => {
    installGisMock();
    await initGoogleAuth();

    const promise = signIn();
    capturedErrorCallback!({ type: "popup_closed", message: "Popup was closed" });

    await expect(promise).rejects.toThrow("Popup was closed");
  });
});

// ---------------------------------------------------------------------------
// refreshToken
// ---------------------------------------------------------------------------

describe("refreshToken", () => {
  it("rejects when not initialized", async () => {
    await expect(refreshToken()).rejects.toThrow("Google auth not initialized");
  });

  it("calls requestAccessToken with empty prompt", async () => {
    installGisMock();
    await initGoogleAuth();

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ email: "user@test.com" }), { status: 200 }),
    );

    const promise = refreshToken();
    expect(mockRequestAccessToken).toHaveBeenCalledWith({ prompt: "" });

    capturedCallback!({ access_token: "ya29.refreshed", expires_in: 3600, scope: "", token_type: "Bearer" });

    const result = await promise;
    expect(result.accessToken).toBe("ya29.refreshed");
  });
});

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------

describe("signOut", () => {
  it("revokes token and clears storage", () => {
    installGisMock();
    saveGoogleToken({ accessToken: "ya29.old", expiresAt: Date.now() + 3600000, email: "x@y.com" });

    signOut();

    expect(window.google!.accounts.oauth2.revoke).toHaveBeenCalledWith("ya29.old", expect.any(Function));
    expect(getGoogleToken()).toBeNull();
  });

  it("clears storage even without a token", () => {
    installGisMock();
    signOut();
    expect(getGoogleToken()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getValidAccessToken
// ---------------------------------------------------------------------------

describe("getValidAccessToken", () => {
  it("throws when not signed in", async () => {
    await expect(getValidAccessToken()).rejects.toThrow("Not signed in");
  });

  it("returns token directly when not expired", async () => {
    saveGoogleToken({ accessToken: "ya29.valid", expiresAt: Date.now() + 300_000, email: "" });
    const token = await getValidAccessToken();
    expect(token).toBe("ya29.valid");
  });

  it("refreshes token when about to expire", async () => {
    installGisMock();
    await initGoogleAuth();

    // Token expires in 30 seconds (within 60s threshold)
    saveGoogleToken({ accessToken: "ya29.expiring", expiresAt: Date.now() + 30_000, email: "" });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ email: "" }), { status: 200 }),
    );

    const promise = getValidAccessToken();

    // Simulate GIS callback for refresh
    capturedCallback!({ access_token: "ya29.fresh", expires_in: 3600, scope: "", token_type: "Bearer" });

    const token = await promise;
    expect(token).toBe("ya29.fresh");
  });
});

// ---------------------------------------------------------------------------
// isSignedIn
// ---------------------------------------------------------------------------

describe("isSignedIn", () => {
  it("returns false when no token stored", () => {
    expect(isSignedIn()).toBe(false);
  });

  it("returns true when token is stored", () => {
    saveGoogleToken({ accessToken: "ya29.test", expiresAt: Date.now() + 3600000, email: "" });
    expect(isSignedIn()).toBe(true);
  });

  it("returns true even for expired tokens (can be refreshed)", () => {
    saveGoogleToken({ accessToken: "ya29.expired", expiresAt: Date.now() - 1000, email: "" });
    expect(isSignedIn()).toBe(true);
  });

  it("returns false after sign out", () => {
    saveGoogleToken({ accessToken: "ya29.test", expiresAt: Date.now() + 3600000, email: "" });
    clearGoogleToken();
    expect(isSignedIn()).toBe(false);
  });
});
