// src/lib/profileStore.ts
export type ProfileData = {
  fullName: string;
  phone: string;
  email: string;
};

const PROFILE_KEY = "hm_profile";

export function readProfile(): ProfileData {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { fullName: "", phone: "", email: "" };
    const p = JSON.parse(raw) as Partial<ProfileData>;
    return {
      fullName: p.fullName ?? "",
      phone: p.phone ?? "",
      email: p.email ?? "",
    };
  } catch {
    return { fullName: "", phone: "", email: "" };
  }
}

export function writeProfile(p: ProfileData) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

/**
 * Merge Firebase user into local profile without deleting existing fields.
 */
export function mergeProfile(next: Partial<ProfileData>) {
  const cur = readProfile();
  const merged: ProfileData = {
    fullName: next.fullName ?? cur.fullName ?? "",
    phone: next.phone ?? cur.phone ?? "",
    email: next.email ?? cur.email ?? "",
  };
  writeProfile(merged);
  return merged;
}