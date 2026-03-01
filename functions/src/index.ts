import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();
const db = getFirestore();

/* ---------------- ADMIN ALLOWLIST ---------------- */

/* ---------------- ADMIN (admins/{uid}.enabled) ---------------- */

async function isAdminUid(uid: string) {
  const snap = await db.doc(`admins/${uid}`).get();
  return snap.exists && snap.data()?.enabled === true;
}

async function requireAdmin(uid: string) {
  if (!(await isAdminUid(uid))) {
    throw new HttpsError("permission-denied", "Admin only.");
  }
}

async function getAdminUids(): Promise<string[]> {
  const snap = await db.collection("admins").where("enabled", "==", true).get();
  return snap.docs.map((d) => d.id).filter(Boolean);
}

/* ---------------- TOKENS HELPERS ---------------- */

async function getTokenForUid(uid: string): Promise<string | null> {
  const snap = await db.doc(`users/${uid}`).get();
  const token = snap.data()?.fcmToken;
  return token ? String(token) : null;
}

async function getTokensForUids(uids: string[]): Promise<string[]> {
  const snaps = await Promise.all(uids.map((u) => db.doc(`users/${u}`).get()));
  const tokens = snaps
    .map((s) => (s.exists ? (s.data()?.fcmToken as string | undefined) : undefined))
    .filter((t): t is string => !!t && t.length > 10);

  // unique
  return Array.from(new Set(tokens));
}

function reservedUidsFromRaffle(raffle: any): string[] {
  const reserved = (raffle?.reserved || {}) as Record<string, any>;
  const uids = Object.values(reserved)
    .map((x: any) => x?.uid)
    .filter(Boolean)
    .map((x: any) => String(x));
  return Array.from(new Set(uids));
}

/* ---------------- PUSH HELPERS ---------------- */

async function notifyAdminsNewRequest(opts: {
  raffleId: string;
  raffleTitle: string;
  number: number;
  name: string;
}) {
  try {
    const adminUids = await getAdminUids();
    const tokens = await getTokensForUids(adminUids);
    if (!tokens.length) return;

    await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: "New payment request 💰",
        body: `${opts.name} requested #${opts.number} (${opts.raffleTitle})`,
      },
      data: {
        type: "reservation_request",
        raffleId: String(opts.raffleId),
        number: String(opts.number),
      },
    });
  } catch (e) {
    console.error("notifyAdminsNewRequest failed:", e);
  }
}

async function notifyUserApproved(opts: {
  userUid: string;
  raffleId: string;
  raffleTitle: string;
  number: number;
}) {
  try {
    const token = await getTokenForUid(opts.userUid);
    if (!token) return;

    await getMessaging().send({
      token,
      notification: {
        title: "Reserved ✅",
        body: `Your number #${opts.number} is approved and reserved (${opts.raffleTitle}).`,
      },
      data: {
        type: "reservation_approved",
        raffleId: String(opts.raffleId),
        number: String(opts.number),
      },
    });
  } catch (e) {
    console.error("notifyUserApproved failed:", e);
  }
}

async function notifyUserRejected(opts: {
  userUid: string;
  raffleId: string;
  raffleTitle: string;
  number: number;
  reason?: string;
}) {
  try {
    const token = await getTokenForUid(opts.userUid);
    if (!token) return;

    await getMessaging().send({
      token,
      notification: {
        title: "Rejected ❌",
        body: `Your request for #${opts.number} was rejected. ${opts.reason ? `Reason: ${opts.reason}` : ""}`.trim(),
      },
      data: {
        type: "reservation_rejected",
        raffleId: String(opts.raffleId),
        number: String(opts.number),
      },
    });
  } catch (e) {
    console.error("notifyUserRejected failed:", e);
  }
}

async function notifyWinner(opts: {
  winnerUid: string;
  raffleId: string;
  raffleTitle: string;
  winnerNumber: number;
}) {
  try {
    const token = await getTokenForUid(opts.winnerUid);
    if (!token) return;

    await getMessaging().send({
      token,
      notification: {
        title: "You won! 🏆",
        body: `You won "${opts.raffleTitle}" with number #${opts.winnerNumber}.`,
      },
      data: {
        type: "raffle_winner",
        raffleId: String(opts.raffleId),
        number: String(opts.winnerNumber),
      },
    });
  } catch (e) {
    console.error("notifyWinner failed:", e);
  }
}

async function broadcastToReservedUsers(opts: {
  raffle: any;
  raffleId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  try {
    const uids = reservedUidsFromRaffle(opts.raffle);
    if (!uids.length) return;

    const tokens = await getTokensForUids(uids);
    if (!tokens.length) return;

    await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: opts.title,
        body: opts.body,
      },
      data: {
        type: "raffle_broadcast",
        raffleId: String(opts.raffleId),
        ...(opts.data || {}),
      },
    });
  } catch (e) {
    console.error("broadcastToReservedUsers failed:", e);
  }
}

/*-------push to all--------*/

const ALL_USERS_TOPIC = "all_users";

/** User saves token + gets subscribed to topic */
export const saveFcmToken = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Login required.");

  const { token } = request.data || {};
  if (!token || typeof token !== "string" || token.length < 20) {
    throw new HttpsError("invalid-argument", "Missing/invalid token.");
  }

  // Save token
  await db.doc(`users/${uid}`).set(
    {
      fcmToken: token,
      fcmUpdatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Subscribe to topic
  try {
    await getMessaging().subscribeToTopic([token], ALL_USERS_TOPIC);
  } catch (e) {
    console.error("subscribeToTopic failed:", e);
    // don't fail the call
  }

  return { success: true };
});




/* ---------------- CREATE RAFFLE (ADMIN) ---------------- */

export const createRaffle = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Login required.");
  await requireAdmin(uid);

  const { title, totalNumbers, pricePerNumber, prize } = request.data || {};
  if (!title || totalNumbers === undefined || pricePerNumber === undefined) {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  const total = Number(totalNumbers);
  const price = Number(pricePerNumber);

  if (!Number.isFinite(total) || total <= 0) {
    throw new HttpsError("invalid-argument", "totalNumbers must be > 0.");
  }
  if (!Number.isFinite(price) || price < 0) {
    throw new HttpsError("invalid-argument", "pricePerNumber must be >= 0.");
  }

  const docRef = await db.collection("raffles").add({
    title: String(title).trim(),
    prize: (prize || "").toString(),
    totalNumbers: Math.floor(total),
    pricePerNumber: price,
    status: "open",
    reserved: {},        // { [number]: { uid, name, approvedAt, pendingId } }
    pendingNumbers: {},  // { [number]: { uid, name, status, pendingId, createdAt } }
    soldCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    winnerNumber: null,
    winnerName: null,
    createdBy: uid,

    // scheduling
    drawAt: null,            // Timestamp (ms) or Firestore Timestamp is OK — we will store ms
    drawAnnouncedAt: null,   // server timestamp when announcement sent
    drawReminderSentAt: null // server timestamp when reminder sent
  });



    // ✅ notify everyone a new raffle is live
  try {
    await getMessaging().send({
      topic: ALL_USERS_TOPIC,
      notification: {
        title: "New Raffle 🎁",
        body: `New raffle: "${String(title).trim()}" — Prize: ${String(prize || "Big prize")} 🎉\nCome be the lucky winner!`,
      },
      data: {
        type: "raffle_new",
        raffleId: docRef.id,
      },
    });
  } catch (e) {
    console.error("new raffle push failed:", e);
  }

  

  return { raffleId: docRef.id };
});

/* ---------------- DELETE RAFFLE (ADMIN) ---------------- */

export const deleteRaffle = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Login required.");
  await requireAdmin(uid);

  const { raffleId } = request.data || {};
  if (!raffleId) throw new HttpsError("invalid-argument", "Missing raffleId.");

  const raffleRef = db.collection("raffles").doc(String(raffleId));
  const pendingSnap = await raffleRef.collection("pending").get();

  const batch = db.batch();
  pendingSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(raffleRef);
  await batch.commit();

  return { success: true };
});




/* ---------------- REQUEST RESERVATION (USER: "I HAVE PAID") ----------------
   Locks the number in raffle.pendingNumbers so no other user can click it
-------------------------------------------------------------------------- */

export const requestReservation = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Login required.");

  const { raffleId, number, name } = request.data || {};
  if (!raffleId || number === undefined) {
    throw new HttpsError("invalid-argument", "Missing raffleId or number.");
  }

  const n = Number(number);
  if (!Number.isFinite(n) || n <= 0) throw new HttpsError("invalid-argument", "Invalid number.");

  const raffleRef = db.collection("raffles").doc(String(raffleId));

  let pendingName = (name || "User").toString().trim().slice(0, 60);
  let raffleTitle = "Raffle";

  const pendingId = await db.runTransaction(async (tx) => {
    const snap = await tx.get(raffleRef);
    if (!snap.exists) throw new HttpsError("not-found", "Raffle not found.");

    const raffle = snap.data() as any;
    raffleTitle = String(raffle.title || "Raffle");

    if (raffle.status !== "open") throw new HttpsError("failed-precondition", "Raffle is not open.");

    const total = Number(raffle.totalNumbers || 0);
    if (n > total) throw new HttpsError("failed-precondition", "Number out of range.");

    const reserved = (raffle.reserved || {}) as Record<string, any>;
    const pendingNumbers = (raffle.pendingNumbers || {}) as Record<string, any>;
    const key = String(n);

    if (reserved[key]) throw new HttpsError("already-exists", "Number already taken.");
    if (pendingNumbers[key]?.status === "pending") {
      throw new HttpsError("already-exists", "Number is awaiting approval.");
    }

    const pRef = raffleRef.collection("pending").doc();
    tx.set(pRef, {
      uid,
      name: pendingName,
      number: n,
      status: "pending",
      reference: `${raffleRef.id}-${n}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    pendingNumbers[key] = {
      uid,
      name: pendingName,
      status: "pending",
      pendingId: pRef.id,
      createdAt: FieldValue.serverTimestamp(),
    };

    tx.update(raffleRef, { pendingNumbers });

    return pRef.id;
  });

  // ✅ Notify admins (after txn success)
  await notifyAdminsNewRequest({
    raffleId: String(raffleId),
    raffleTitle,
    number: n,
    name: pendingName,
  });

  return { success: true, pendingId, status: "pending" };
});

/* ---------------- LIST PENDING (ADMIN) ---------------- */

export const listPendingReservations = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Login required.");
  await requireAdmin(uid);

  const { raffleId } = request.data || {};
  if (!raffleId) throw new HttpsError("invalid-argument", "Missing raffleId.");

  const raffleRef = db.collection("raffles").doc(String(raffleId));
  const snap = await raffleRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Raffle not found.");

  const pendingSnap = await raffleRef
    .collection("pending")
    .where("status", "==", "pending")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const items = pendingSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return { items };
});

/* ---------------- APPROVE (ADMIN) ----------------
   Moves number to reserved, increments soldCount, removes pending lock
--------------------------------------------------- */

export const approveReservation = onCall(async (request) => {
  const adminUid = request.auth?.uid;
  if (!adminUid) throw new HttpsError("unauthenticated", "Login required.");
  await requireAdmin(adminUid);

  const { raffleId, pendingId } = request.data || {};
  if (!raffleId || !pendingId) throw new HttpsError("invalid-argument", "Missing raffleId or pendingId.");

  const raffleRef = db.collection("raffles").doc(String(raffleId));
  const pendingRef = raffleRef.collection("pending").doc(String(pendingId));

  let approvedUserUid = "";
  let approvedNumber = 0;
  let raffleTitle = "Raffle";
  let becameSoldOut = false;

  await db.runTransaction(async (tx) => {
    const [raffleSnap, pendingSnap] = await Promise.all([tx.get(raffleRef), tx.get(pendingRef)]);

    if (!raffleSnap.exists) throw new HttpsError("not-found", "Raffle not found.");
    if (!pendingSnap.exists) throw new HttpsError("not-found", "Pending request not found.");

    const raffle = raffleSnap.data() as any;
    const pending = pendingSnap.data() as any;
    raffleTitle = String(raffle.title || "Raffle");

    if (raffle.status !== "open") throw new HttpsError("failed-precondition", "Raffle is not open.");
    if (pending.status !== "pending") throw new HttpsError("failed-precondition", "Request is not pending.");

    const total = Number(raffle.totalNumbers || 0);
    const number = Number(pending.number);
    if (!Number.isFinite(number) || number <= 0 || number > total) {
      throw new HttpsError("failed-precondition", "Invalid requested number.");
    }

    const reserved = (raffle.reserved || {}) as Record<string, any>;
    const pendingNumbers = (raffle.pendingNumbers || {}) as Record<string, any>;
    const key = String(number);

    if (reserved[key]) {
      tx.update(pendingRef, {
        status: "rejected",
        rejectReason: "Number already taken",
        decidedAt: FieldValue.serverTimestamp(),
        decidedBy: adminUid,
      });

      delete pendingNumbers[key];
      tx.update(raffleRef, { pendingNumbers });

      throw new HttpsError("already-exists", "Number already taken.");
    }

    reserved[key] = {
      uid: pending.uid,
      name: pending.name || "User",
      approvedAt: FieldValue.serverTimestamp(),
      pendingId: pendingRef.id,
    };

    delete pendingNumbers[key];

    const soldCount = Number(raffle.soldCount || 0) + 1;
    const newStatus = soldCount >= total ? "sold_out" : "open";
    becameSoldOut = newStatus === "sold_out";

    tx.update(raffleRef, {
      reserved,
      pendingNumbers,
      soldCount,
      status: newStatus,
    });

    tx.update(pendingRef, {
      status: "approved",
      decidedAt: FieldValue.serverTimestamp(),
      decidedBy: adminUid,
    });

    approvedUserUid = String(pending.uid || "");
    approvedNumber = number;
  });

  // ✅ push to approved user
  if (approvedUserUid) {
    await notifyUserApproved({
      userUid: approvedUserUid,
      raffleId: String(raffleId),
      raffleTitle,
      number: approvedNumber,
    });
  }

  // Optional: when sold out but draw time not set yet, admin will set it using scheduleDrawTime.
 if (becameSoldOut) {
  const adminUids = await getAdminUids();
  const tokens = await getTokensForUids(adminUids);

  if (tokens.length) {
    await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: "Raffle sold out ✅",
        body: `Raffle "${raffleTitle}" is complete. Schedule the draw time.`,
      },
      data: {
        type: "raffle_sold_out",
        raffleId: String(raffleId),
      },
    });
  }
}

  return { success: true, becameSoldOut };
});

/* ---------------- REJECT (ADMIN) ----------------
   Marks pending doc rejected and frees pending lock + notify user ❌
-------------------------------------------------- */

export const rejectReservation = onCall(async (request) => {
  const adminUid = request.auth?.uid;
  if (!adminUid) throw new HttpsError("unauthenticated", "Login required.");
  await requireAdmin(adminUid);

  const { raffleId, pendingId, reason } = request.data || {};
  if (!raffleId || !pendingId) throw new HttpsError("invalid-argument", "Missing raffleId or pendingId.");

  const raffleRef = db.collection("raffles").doc(String(raffleId));
  const pendingRef = raffleRef.collection("pending").doc(String(pendingId));

  const raffleSnap = await raffleRef.get();
  if (!raffleSnap.exists) throw new HttpsError("not-found", "Raffle not found.");
  const raffle = raffleSnap.data() as any;
  const raffleTitle = String(raffle.title || "Raffle");

  const p = await pendingRef.get();
  if (!p.exists) throw new HttpsError("not-found", "Pending request not found.");

  const data = p.data() as any;
  if (data.status !== "pending") throw new HttpsError("failed-precondition", "Request is not pending.");

  await pendingRef.update({
    status: "rejected",
    rejectReason: (reason || "Rejected").toString().slice(0, 120),
    decidedAt: FieldValue.serverTimestamp(),
    decidedBy: adminUid,
  });

  // free lock on raffle doc
  const snap2 = await raffleRef.get();
  if (snap2.exists) {
    const r = snap2.data() as any;
    const pendingNumbers = (r.pendingNumbers || {}) as Record<string, any>;
    const key = String(data.number);
    delete pendingNumbers[key];
    await raffleRef.update({ pendingNumbers });
  }

  // ✅ notify user rejected
  const rejectedUserUid = String(data.uid || "");
  const rejectedNumber = Number(data.number || 0);
  const rejectedReason = String((reason || data.rejectReason || "Rejected") ?? "").slice(0, 120);

  if (rejectedUserUid && rejectedNumber) {
    await notifyUserRejected({
      userUid: rejectedUserUid,
      raffleId: String(raffleId),
      raffleTitle,
      number: rejectedNumber,
      reason: rejectedReason,
    });
  }

  return { success: true };
});

/* ---------------- DRAW WINNER (ADMIN) ---------------- */

export const drawWinner = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Login required.");
  await requireAdmin(uid);

  const { raffleId } = request.data || {};
  if (!raffleId) throw new HttpsError("invalid-argument", "Missing raffleId.");

  const raffleRef = db.collection("raffles").doc(String(raffleId));
  const snap = await raffleRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Raffle not found.");

  const raffle = snap.data() as any;
  const raffleTitle = String(raffle.title || "Raffle");

  if (raffle.status !== "sold_out") throw new HttpsError("failed-precondition", "Not sold out yet.");

  const numbers = Object.keys(raffle.reserved || {});
  if (numbers.length === 0) throw new HttpsError("failed-precondition", "No reserved numbers.");

  const winnerNumber = Number(numbers[Math.floor(Math.random() * numbers.length)]);
  const winnerName = raffle.reserved[String(winnerNumber)]?.name || "Winner";
  const winnerUid = raffle.reserved[String(winnerNumber)]?.uid;

  await raffleRef.update({
    status: "drawn",
    winnerNumber,
    winnerName,
    drawnAt: FieldValue.serverTimestamp(),
    drawnBy: uid,
  });

  // ✅ notify winner
  if (winnerUid) {
    await notifyWinner({
      winnerUid: String(winnerUid),
      raffleId: String(raffleId),
      raffleTitle,
      winnerNumber,
    });
  }

  return { winnerNumber, winnerName };
});

/* ---------------- RE-DRAW WINNER (ADMIN, ONLY IF DRAWN) ---------------- */

export const redrawWinner = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Login required.");
  await requireAdmin(uid);

  const { raffleId } = request.data || {};
  if (!raffleId) throw new HttpsError("invalid-argument", "Missing raffleId.");

  const raffleRef = db.collection("raffles").doc(String(raffleId));
  const snap = await raffleRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Raffle not found.");

  const raffle = snap.data() as any;
  const raffleTitle = String(raffle.title || "Raffle");

  if (raffle.status !== "drawn") throw new HttpsError("failed-precondition", "Raffle must be DRAWN to re-draw.");

  const numbers = Object.keys(raffle.reserved || {});
  if (numbers.length === 0) throw new HttpsError("failed-precondition", "No reserved numbers.");

  const winnerNumber = Number(numbers[Math.floor(Math.random() * numbers.length)]);
  const winnerName = raffle.reserved[String(winnerNumber)]?.name || "Winner";
  const winnerUid = raffle.reserved[String(winnerNumber)]?.uid;

  await raffleRef.update({
    winnerNumber,
    winnerName,
    redrawnAt: FieldValue.serverTimestamp(),
    redrawnBy: uid,
  });

  // ✅ notify winner (new winner)
  if (winnerUid) {
    await notifyWinner({
      winnerUid: String(winnerUid),
      raffleId: String(raffleId),
      raffleTitle,
      winnerNumber,
    });
  }

  return { winnerNumber, winnerName };
});

/* ---------------- FORCE SOLD OUT (ADMIN, TEST) ---------------- */

export const forceSoldOut = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Login required.");
  await requireAdmin(uid);

  const { raffleId } = request.data || {};
  if (!raffleId) throw new HttpsError("invalid-argument", "Missing raffleId.");

  const raffleRef = db.collection("raffles").doc(String(raffleId));
  const snap = await raffleRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Raffle not found.");

  const raffle = snap.data() as any;
  const total = Number(raffle.totalNumbers || 0);
  const reserved = (raffle.reserved || {}) as Record<string, any>;
  const soldCount = Object.keys(reserved).length;

  if (soldCount < total) {
    throw new HttpsError("failed-precondition", `Not full yet: ${soldCount}/${total}.`);
  }

  await raffleRef.update({
    status: "sold_out",
    soldCount: total,
    forcedSoldOutAt: FieldValue.serverTimestamp(),
    forcedSoldOutBy: uid,
  });

  return { success: true };
});

/* ---------------- SCHEDULE DRAW TIME (ADMIN) ----------------
   Admin sets draw time (e.g. 8:00 PM), and broadcast to all reserved users.
   drawAtMs = epoch milliseconds (client can send it).
------------------------------------------------------------- */

export const scheduleDrawTime = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Login required.");
  await requireAdmin(uid);

  const { raffleId, drawAtMs } = request.data || {};
  if (!raffleId || !drawAtMs) throw new HttpsError("invalid-argument", "Missing raffleId or drawAtMs.");

  const drawAt = Number(drawAtMs);
  if (!Number.isFinite(drawAt) || drawAt < Date.now() - 60_000) {
    throw new HttpsError("invalid-argument", "drawAtMs must be a valid future time.");
  }

  const raffleRef = db.collection("raffles").doc(String(raffleId));
  const snap = await raffleRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Raffle not found.");

  const raffle = snap.data() as any;
  const raffleTitle = String(raffle.title || "Raffle");

  await raffleRef.update({
    drawAt: drawAt, // store epoch ms
    drawAnnouncedAt: FieldValue.serverTimestamp(),
    drawAnnouncedBy: uid,
  });

  // Broadcast announcement now
  const dateStr = new Date(drawAt).toLocaleString(); // user will see their locale time
  await broadcastToReservedUsers({
    raffle,
    raffleId: String(raffleId),
    title: "Raffle sold out 🎉",
    body: `Raffle "${raffleTitle}" is complete. Draw at: ${dateStr}`,
    data: { type: "raffle_sold_out", drawAtMs: String(drawAt) },
  });

  return { success: true };
});

/* ---------------- DRAW REMINDER (SCHEDULED) ----------------
   Runs every minute:
   - finds raffles with drawAt set
   - status sold_out
   - drawReminderSentAt == null
   - drawAt <= now
   then broadcasts "Draw time!" to all reserved users.
------------------------------------------------------------- */

export const drawReminderWorker = onSchedule("every 1 minutes", async () => {
  const now = Date.now();

  // We query only by status == sold_out (simple index)
  const snap = await db
    .collection("raffles")
    .where("status", "==", "sold_out")
    .limit(200)
    .get();

  if (snap.empty) return;

  for (const docSnap of snap.docs) {
    const raffle = docSnap.data() as any;

    const drawAt = Number(raffle.drawAt || 0);
    const alreadySent = !!raffle.drawReminderSentAt;

    if (!drawAt || alreadySent) continue;
    if (drawAt > now) continue;

    const raffleTitle = String(raffle.title || "Raffle");

    // Mark sent first to avoid duplicates if function retries
    await docSnap.ref.update({
      drawReminderSentAt: FieldValue.serverTimestamp(),
    });

    await broadcastToReservedUsers({
      raffle,
      raffleId: docSnap.id,
      title: "Draw time! 🎥",
      body: `The draw for "${raffleTitle}" is happening now. Open the app to watch.`,
      data: { type: "raffle_draw_time", drawAtMs: String(drawAt) },
    });
  }
});