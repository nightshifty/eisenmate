import { renderHook, act } from "@testing-library/react";
import { useGoogleAuth } from "./useGoogleAuth";
import { saveGoogleToken } from "@/lib/storage";

// Mock google-auth module
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockInitGoogleAuth = vi.fn().mockResolvedValue(undefined);
const mockIsSignedIn = vi.fn().mockReturnValue(false);

vi.mock("@/lib/google-auth", () => ({
  initGoogleAuth: (...args: unknown[]) => mockInitGoogleAuth(...args),
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  isSignedIn: () => mockIsSignedIn(),
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockIsSignedIn.mockReturnValue(false);
});

describe("useGoogleAuth", () => {
  it("initializes with not signed in state", () => {
    const { result } = renderHook(() => useGoogleAuth());

    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.email).toBe("");
    expect(result.current.error).toBeNull();
  });

  it("initializes as signed in when token exists", () => {
    saveGoogleToken({ accessToken: "ya29.test", expiresAt: Date.now() + 3600000, email: "user@test.com" });
    mockIsSignedIn.mockReturnValue(true);

    const { result } = renderHook(() => useGoogleAuth());

    expect(result.current.isSignedIn).toBe(true);
    expect(result.current.email).toBe("user@test.com");
  });

  it("calls initGoogleAuth on mount", () => {
    renderHook(() => useGoogleAuth());
    expect(mockInitGoogleAuth).toHaveBeenCalledTimes(1);
  });

  it("signIn sets loading state and resolves", async () => {
    mockSignIn.mockResolvedValue({ accessToken: "ya29.new", expiresAt: Date.now() + 3600000, email: "new@test.com" });

    const { result } = renderHook(() => useGoogleAuth());

    await act(async () => {
      await result.current.signIn();
    });

    expect(result.current.isSignedIn).toBe(true);
    expect(result.current.email).toBe("new@test.com");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("signIn sets error on failure", async () => {
    mockSignIn.mockRejectedValue(new Error("access_denied"));

    const { result } = renderHook(() => useGoogleAuth());

    await act(async () => {
      await result.current.signIn();
    });

    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.error).toBe("access_denied");
    expect(result.current.isLoading).toBe(false);
  });

  it("signOut clears state", () => {
    saveGoogleToken({ accessToken: "ya29.test", expiresAt: Date.now() + 3600000, email: "user@test.com" });
    mockIsSignedIn.mockReturnValue(true);

    const { result } = renderHook(() => useGoogleAuth());

    act(() => {
      result.current.signOut();
    });

    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.email).toBe("");
    expect(result.current.error).toBeNull();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
