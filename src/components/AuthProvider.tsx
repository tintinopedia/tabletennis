"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from "firebase/auth";
import { fb, ALLOWED_EMAIL, DEMO_MODE } from "@/lib/firebase";

type User = { email: string; name: string; photo: string | null };
type Ctx = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthCtx = createContext<Ctx | null>(null);
const DEMO_KEY = "ahaan-tt-demo-signed-in";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const f = fb();
    if (!f) {
      if (localStorage.getItem(DEMO_KEY)) setUser({ email: ALLOWED_EMAIL, name: "Ahaan (preview)", photo: null });
      setLoading(false);
      return;
    }
    return onAuthStateChanged(f.auth, async (u) => {
      if (u && (u.email || "").toLowerCase() !== ALLOWED_EMAIL) {
        setError(`${u.email} is not allowed. Only ${ALLOWED_EMAIL} can sign in.`);
        await fbSignOut(f.auth);
        setUser(null);
      } else {
        setUser(u ? { email: u.email!, name: u.displayName || "Ahaan", photo: u.photoURL } : null);
      }
      setLoading(false);
    });
  }, []);

  const signIn = async () => {
    setError(null);
    const f = fb();
    if (!f) {
      localStorage.setItem(DEMO_KEY, "1");
      setUser({ email: ALLOWED_EMAIL, name: "Ahaan (preview)", photo: null });
      return;
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ login_hint: ALLOWED_EMAIL, hd: ALLOWED_EMAIL.split("@")[1], prompt: "select_account" });
    try {
      await signInWithPopup(f.auth, provider);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") setError("Sign-in failed. Please try again.");
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

  return <AuthCtx.Provider value={{ user, loading, error, signIn, signOut }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
export { DEMO_MODE };
