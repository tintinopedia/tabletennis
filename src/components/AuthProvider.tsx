"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type AuthCredential,
  type User as FbUser,
} from "firebase/auth";
import { fb, ALLOWED_EMAIL, DEMO_MODE } from "@/lib/firebase";

export type ProviderId = "google" | "github";
type User = { email: string; name: string; photo: string | null };
type Ctx = {
  user: User | null;
  loading: boolean;
  error: string | null;
  /** set when GitHub needs a one-time link to the existing Google account */
  pendingLink: boolean;
  signIn: (p?: ProviderId) => Promise<boolean>;
  completeLink: () => Promise<boolean>;
  signOut: () => Promise<void>;
};
const AuthCtx = createContext<Ctx | null>(null);
const DEMO_KEY = "ahaan-tt-demo-signed-in";

const emailsOf = (u: FbUser) => [u.email, ...u.providerData.map((p) => p.email)].filter(Boolean).map((e) => e!.toLowerCase());

function googleProvider() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ login_hint: ALLOWED_EMAIL, prompt: "select_account" });
  return p;
}
function githubProvider() {
  const p = new GithubAuthProvider();
  p.addScope("user:email");
  p.setCustomParameters({ allow_signup: "false" });
  return p;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<AuthCredential | null>(null);

  useEffect(() => {
    const f = fb();
    if (!f) {
      if (localStorage.getItem(DEMO_KEY)) setUser({ email: ALLOWED_EMAIL, name: "Tintin (preview)", photo: null });
      setLoading(false);
      return;
    }
    return onAuthStateChanged(f.auth, async (u) => {
      if (u && !emailsOf(u).includes(ALLOWED_EMAIL)) {
        setError(`${u.email ?? "That account"} is not allowed. Only ${ALLOWED_EMAIL} can sign in.`);
        await fbSignOut(f.auth);
        setUser(null);
      } else {
        setUser(u ? { email: ALLOWED_EMAIL, name: u.displayName || "Tintin", photo: u.photoURL } : null);
      }
      setLoading(false);
    });
  }, []);

  const signIn = async (p: ProviderId = "google"): Promise<boolean> => {
    setError(null);
    const f = fb();
    if (!f) {
      localStorage.setItem(DEMO_KEY, "1");
      setUser({ email: ALLOWED_EMAIL, name: "Tintin (preview)", photo: null });
      return true;
    }
    try {
      const res = await signInWithPopup(f.auth, p === "github" ? githubProvider() : googleProvider());
      return emailsOf(res.user).includes(ALLOWED_EMAIL);
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return false;
      if (code === "auth/account-exists-with-different-credential" && p === "github") {
        // Same email already signs in with Google: link GitHub to that account once.
        const cred = GithubAuthProvider.credentialFromError(e as never);
        if (cred) {
          setPending(cred);
          setError("This email already signs in with Google. Continue with Google once to connect GitHub; after that either button works.");
          return false;
        }
      }
      if (code === "auth/operation-not-allowed") setError("This sign-in method is not turned on in Firebase yet.");
      else if (code === "auth/unauthorized-domain") setError("This website address is not on Firebase's Authorized domains list.");
      else setError(`Sign-in failed${code ? ` (${code})` : ""}. Please try again.`);
      return false;
    }
  };

  const completeLink = async (): Promise<boolean> => {
    const f = fb();
    if (!f || !pending) return false;
    try {
      const res = await signInWithPopup(f.auth, googleProvider());
      await linkWithCredential(res.user, pending);
      setPending(null);
      setError(null);
      return true;
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (code !== "auth/popup-closed-by-user") setError(`Could not connect GitHub${code ? ` (${code})` : ""}.`);
      return false;
    }
  };

  const signOut = async () => {
    const f = fb();
    if (!f) {
      localStorage.removeItem(DEMO_KEY);
      setUser(null);
      return;
    }
    await fbSignOut(f.auth);
  };

  return <AuthCtx.Provider value={{ user, loading, error, pendingLink: !!pending, signIn, completeLink, signOut }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
export { DEMO_MODE };
