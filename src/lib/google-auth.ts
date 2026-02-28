import { getGoogleToken, saveGoogleToken, clearGoogleToken, type GoogleTokenData } from "./storage";

const CLIENT_ID = "857884825888-t1nd9jq5oa6band1rurtioqhrlgqdnqu.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.appdata";

// ---------------------------------------------------------------------------
// Google Identity Services (GIS) type declarations
// ---------------------------------------------------------------------------

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
  // callback is set during initTokenClient
}

interface GoogleAccounts {
  oauth2: {
    initTokenClient: (config: {
      client_id: string;
      scope: string;
      callback: (resp: TokenResponse) => void;
      error_callback?: (error: { type: string; message: string }) => void;
    }) => TokenClient;
    revoke: (token: string, callback?: () => void) => void;
  };
}

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let tokenClient: TokenClient | null = null;
let pendingResolve: ((token: GoogleTokenData) => void) | null = null;
let pendingReject: ((err: Error) => void) | null = null;

/** Reset module state (for testing only). */
export function _resetForTesting(): void {
  tokenClient = null;
  pendingResolve = null;
  pendingReject = null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Wait until the GIS script has loaded. */
export function waitForGis(timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) {
      resolve();
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      if (window.google?.accounts) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error("Google Identity Services failed to load"));
      }
    }, 100);
  });
}

/** Initialize the token client (call once, e.g. in App mount). */
export async function initGoogleAuth(): Promise<void> {
  await waitForGis();
  if (tokenClient) return; // already initialized

  tokenClient = window.google!.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response: TokenResponse) => {
      if (response.error) {
        pendingReject?.(new Error(response.error_description ?? response.error));
        pendingResolve = null;
        pendingReject = null;
        return;
      }

      // Fetch user email from the userinfo endpoint
      fetchUserEmail(response.access_token).then((email) => {
        const tokenData: GoogleTokenData = {
          accessToken: response.access_token,
          expiresAt: Date.now() + response.expires_in * 1000,
          email,
        };
        saveGoogleToken(tokenData);
        pendingResolve?.(tokenData);
        pendingResolve = null;
        pendingReject = null;
      }).catch((err) => {
        // Still save even if email fetch fails
        const tokenData: GoogleTokenData = {
          accessToken: response.access_token,
          expiresAt: Date.now() + response.expires_in * 1000,
          email: "",
        };
        saveGoogleToken(tokenData);
        pendingResolve?.(tokenData);
        pendingResolve = null;
        pendingReject = null;
        console.warn("Failed to fetch user email:", err);
      });
    },
    error_callback: (error) => {
      pendingReject?.(new Error(error.message ?? "Google auth error"));
      pendingResolve = null;
      pendingReject = null;
    },
  });
}

/** Trigger sign-in. Returns the token data on success. */
export function signIn(): Promise<GoogleTokenData> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error("Google auth not initialized"));
      return;
    }
    pendingResolve = resolve;
    pendingReject = reject;
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

/** Request a fresh token (no consent prompt — for silent refresh). */
export function refreshToken(): Promise<GoogleTokenData> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error("Google auth not initialized"));
      return;
    }
    pendingResolve = resolve;
    pendingReject = reject;
    tokenClient.requestAccessToken({ prompt: "" });
  });
}

/** Sign out and revoke the token. */
export function signOut(): void {
  const token = getGoogleToken();
  if (token) {
    window.google?.accounts.oauth2.revoke(token.accessToken, () => {
      // Revocation complete
    });
  }
  clearGoogleToken();
}

/** Get a valid access token, refreshing if expired. */
export async function getValidAccessToken(): Promise<string> {
  const token = getGoogleToken();
  if (!token) throw new Error("Not signed in");

  // Refresh if token expires within 60 seconds
  if (Date.now() >= token.expiresAt - 60_000) {
    const refreshed = await refreshToken();
    return refreshed.accessToken;
  }

  return token.accessToken;
}

/** Check if the user is currently signed in (has a non-expired token). */
export function isSignedIn(): boolean {
  const token = getGoogleToken();
  if (!token) return false;
  // Consider signed in even if token is expired (we can refresh)
  return !!token.accessToken;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchUserEmail(accessToken: string): Promise<string> {
  const resp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) return "";
  const data = await resp.json();
  return data.email ?? "";
}
