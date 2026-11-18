import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, type Firestore } from "firebase/firestore";

// Public web-app identifiers (safe to ship; data is protected by firestore.rules).
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDqrb4gENTGaR3oXUBkueNquKax66tMz0E",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "tintinopedia.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tintinopedia",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:533842236675:web:4d2ce7e9a00479e94c8536",
};

export const ALLOWED_EMAIL = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL || "ahaan@tintinopedia.com").toLowerCase();
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO === "1";

let cached: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;
export function fb(): { app: FirebaseApp; auth: Auth; db: Firestore } | null {
  if (DEMO_MODE) return null;
  if (!cached) {
    const app = getApps()[0] ?? initializeApp(config);
    cached = { app, auth: getAuth(app), db: initializeFirestore(app, { ignoreUndefinedProperties: true }) };
  }
  return cached;
}
