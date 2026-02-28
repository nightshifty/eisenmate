import { useState, useEffect, useCallback } from "react";
import { getGoogleToken } from "@/lib/storage";
import { initGoogleAuth, signIn as gSignIn, signOut as gSignOut, isSignedIn as checkSignedIn } from "@/lib/google-auth";

export interface GoogleAuthState {
  isSignedIn: boolean;
  isLoading: boolean;
  email: string;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
}

export function useGoogleAuth(): GoogleAuthState {
  const [isSignedIn, setIsSignedIn] = useState(() => checkSignedIn());
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState(() => getGoogleToken()?.email ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initGoogleAuth().catch((err) => {
      console.warn("Google Auth init failed:", err);
    });
  }, []);

  const signIn = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const tokenData = await gSignIn();
      setIsSignedIn(true);
      setEmail(tokenData.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    gSignOut();
    setIsSignedIn(false);
    setEmail("");
    setError(null);
  }, []);

  return { isSignedIn, isLoading, email, error, signIn, signOut };
}
