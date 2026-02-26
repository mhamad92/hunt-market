// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, updateProfile } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// IMPORTANT: match your deployed region
export const functions = getFunctions(app, "us-central1");

/**
 * Ensures we have a Firebase user (anonymous auth) so reservations are per-user
 * Works even if your app uses local login (hm_logged_in).
 */
export async function ensureFirebaseUser(displayName?: string) {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  if (displayName && auth.currentUser && auth.currentUser.displayName !== displayName) {
    try {
      await updateProfile(auth.currentUser, { displayName });
    } catch {
      // ignore
    }
  }
  return auth.currentUser!;
}