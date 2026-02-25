// src/utils/authLocal.ts

export type LocalUser = {
  id: string;
  fullName: string;
  phone: string;      // stored as digits only (e.g. 96170123456)
  email: string;      // stored normalized (lowercase)
  password: string;   // local only (replace with Firebase later)
  createdAt: number;
};

const USERS_KEY = "hm_users";
const LOGGED_KEY = "hm_logged_in";
const SESSION_KEY = "hm_session_user"; // { id, email }
const PROFILE_KEY = "hm_profile";      // { fullName, phone, email }

export function normalizeEmail(v: string) {
  return (v ?? "").trim().toLowerCase();
}

// good UI validation (not perfect RFC, but solid)
export function isValidEmail(v: string) {
  const email = normalizeEmail(v);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// digits only
export function digitsOnly(v: string) {
  return (v ?? "").replace(/\D/g, "");
}

// If you want + allowed ONLY at start, use this instead:
// export function phonePlusDigits(v: string) {
//   return (v ?? "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
// }

function readUsers(): LocalUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as LocalUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: LocalUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function setLoggedIn(user: LocalUser) {
  localStorage.setItem(LOGGED_KEY, "1");
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, email: user.email }));
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ fullName: user.fullName, phone: user.phone, email: user.email }));
}

export function getSessionUser(): { id: string; email: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as { id: string; email: string }) : null;
  } catch {
    return null;
  }
}

export function registerLocalUser(input: {
  fullName: string;
  phone: string;
  email: string;
  password: string;
}) {
  const fullName = (input.fullName ?? "").trim();
  const phone = digitsOnly(input.phone ?? "");
  const email = normalizeEmail(input.email ?? "");
  const password = input.password ?? "";

  if (!fullName) throw new Error("Full name is required.");
  if (!phone) throw new Error("Phone is required.");
  if (phone.length < 7) throw new Error("Please enter a valid phone number.");
  if (!email) throw new Error("Email is required.");
  if (!isValidEmail(email)) throw new Error("Please enter a valid email address.");
  if (!password || password.length < 6) throw new Error("Password must be at least 6 characters.");

  const users = readUsers();
  if (users.some((u) => u.email === email)) {
    throw new Error("An account with this email already exists.");
  }

  const user: LocalUser = {
    id: Math.random().toString(16).slice(2) + Date.now().toString(16),
    fullName,
    phone,
    email,
    password,
    createdAt: Date.now(),
  };

  users.unshift(user);
  writeUsers(users);
  setLoggedIn(user);

  return user;
}

export function loginLocalUser(emailRaw: string, password: string) {
  const email = normalizeEmail(emailRaw ?? "");
  const pass = password ?? "";

  if (!email) throw new Error("Email is required.");
  if (!isValidEmail(email)) throw new Error("Please enter a valid email address.");
  if (!pass) throw new Error("Password is required.");

  const users = readUsers();
  const user = users.find((u) => u.email === email);

  if (!user) throw new Error("No account found with this email.");
  if (user.password !== pass) throw new Error("Incorrect password.");

  setLoggedIn(user);
  return user;
}

export function logoutLocalUser() {
  localStorage.setItem(LOGGED_KEY, "0");
  localStorage.removeItem(SESSION_KEY);
  // keep users + profile saved locally (so user can login again)
}

export function changeLocalPassword(currentPassword: string, newPassword: string) {
  const session = getSessionUser();
  if (!session?.id) throw new Error("You are not logged in.");

  const cur = currentPassword ?? "";
  const next = newPassword ?? "";

  if (!cur) throw new Error("Current password is required.");
  if (!next || next.length < 6) throw new Error("New password must be at least 6 characters.");

  const users = readUsers();
  const idx = users.findIndex((u) => u.id === session.id);

  if (idx === -1) throw new Error("User not found.");
  if (users[idx].password !== cur) throw new Error("Current password is incorrect.");

  users[idx] = { ...users[idx], password: next };
  writeUsers(users);

  return true;
}