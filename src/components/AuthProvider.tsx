"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
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
  /** true when GitHub is already connected to this account */
  githubLinked: boolean;
  connectGithub: () => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthCtx = createContext<Ctx | null>(null);
const DEMO_KEY = "ahaan-tt-demo-signed-in";

const emailsOf = (u: FbUser) => [u.email, ...u.providerData.map((p) => p.email)].filter(Boolean).map((e) => e!.toLowerCase());

function googleProvider() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: "select_account" });
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
  const [githubLinked, setGithubLinked] = useState(false);

  useEffect(() => {
    const f = fb();
    if (!f) {
      if (localStorage.getItem(DEMO_KEY)) setUser({ email: ALLOWED_EMAIL, name: "Tintin (preview)", photo: null });
      setLoading(false);
      return;
    }
    return onAuthStateChanged(f.auth, async (u) => {
      if (u && !emailsOf(u).includes(ALLOWED_EMAIL)) {
        setError(`${u.email ?? "That account"} is not allowed. Only Ahaan can sign in.`);
        await fbSignOut(f.auth);
        setUser(null);
      } else {
        setUser(u ? { email: ALLOWED_EMAIL, name: u.displayName || "Tintin", photo: u.photoURL } : null);
        setGithubLinked(!!u?.providerData.some((p) => p.providerId === "github.com"));
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
      if (p === "google" && pending) {
        try {
          await linkWithCredential(res.user, pending);
          setGithubLinked(true);
        } catch (le) {
          console.warn("link github", (le as { code?: string }).code);
        }
        setPending(null);
      }
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
      try {
        await linkWithCredential(res.user, pending);
        setGithubLinked(true);
      } catch (le) {
        const lc = (le as { code?: string }).code ?? "";
        // already connected is fine; anything else: signed in with Google anyway, offer Connect GitHub later
        if (lc !== "auth/provider-already-linked") setError(`Signed in with Google. GitHub could not be connected automatically (${lc}); use "Connect GitHub" in Studio.`);
        else setGithubLinked(true);
        setPending(null);
        return true;
      }
      setPending(null);
      setError(null);
      return true;
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (code !== "auth/popup-closed-by-user") setError(`Could not connect GitHub${code ? ` (${code})` : ""}.`);
      return false;
    }
  };

  const connectGithub = async () => {
    const f = fb();
    if (!f?.auth.currentUser) return;
    setError(null);
    try {
      await linkWithPopup(f.auth.currentUser, githubProvider());
      setGithubLinked(true);
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (code === "auth/provider-already-linked") setGithubLinked(true);
      else if (code === "auth/credential-already-in-use")
        setError("That GitHub account is already attached to a separate login. In Firebase > Authentication > Users, delete the GitHub-only user, then try Connect GitHub again.");
      else if (code !== "auth/popup-closed-by-user") setError(`Could not connect GitHub${code ? ` (${code})` : ""}.`);
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

  return <AuthCtx.Provider value={{ user, loading, error, pendingLink: !!pending, signIn, completeLink, githubLinked: DEMO_MODE || githubLinked, connectGithub, signOut }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
export { DEMO_MODE };
