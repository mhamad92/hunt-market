import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Keeps old function name so app doesn’t break
export async function loginLocalUser(email: string, password: string) {
  const res = await signInWithEmailAndPassword(auth, email, password);
  return res.user;
}

// Keeps old function name so app doesn’t break
export async function registerLocalUser(email: string, password: string, fullName?: string) {
  const res = await createUserWithEmailAndPassword(auth, email, password);

  if (fullName) {
    await updateProfile(res.user, { displayName: fullName });
    await setDoc(
      doc(db, "users", res.user.uid),
      { fullName, email, createdAt: serverTimestamp() },
      { merge: true }
    );
  }

  return res.user;
}

export async function logoutLocalUser() {
  await signOut(auth);
}