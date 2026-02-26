import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();
const db = getFirestore();

/* ---------------- ADMIN ALLOWLIST ---------------- */

async function isAdminUid(uid: string) {
  const snap = await db.doc("settings/admin").get();
  const uids = (snap.data()?.uids || []) as string[];
  return uids.includes(uid);
}

async function requireAdmin(uid: string) {
  if (!(await isAdminUid(uid))) {
    throw new HttpsError("permission-denied", "Admin only.");
  }
}

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
  });

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
  if (!Number.isFinite(n) || n <= 0) {
    throw new HttpsError("invalid-argument", "Invalid number.");
  }

  const raffleRef = db.collection("raffles").doc(String(raffleId));

  const pendingId = await db.runTransaction(async (tx) => {
    const snap = await tx.get(raffleRef);
    if (!snap.exists) throw new HttpsError("not-found", "Raffle not found.");

    const raffle = snap.data() as any;

    if (raffle.status !== "open") {
      throw new HttpsError("failed-precondition", "Raffle is not open.");
    }

    const total = Number(raffle.totalNumbers || 0);
    if (n > total) throw new HttpsError("failed-precondition", "Number out of range.");

    const reserved = (raffle.reserved || {}) as Record<string, any>;
    const pendingNumbers = (raffle.pendingNumbers || {}) as Record<string, any>;
    const key = String(n);

    if (reserved[key]) throw new HttpsError("already-exists", "Number already taken.");
    if (pendingNumbers[key]?.status === "pending") {
      throw new HttpsError("already-exists", "Number is awaiting approval.");
    }

    // Create pending doc
    const pRef = raffleRef.collection("pending").doc();
    tx.set(pRef, {
      uid,
      name: (name || "User").toString().trim().slice(0, 60),
      number: n,
      status: "pending",
      reference: `${raffleRef.id}-${n}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Lock globally as pending
    pendingNumbers[key] = {
      uid,
      name: (name || "User").toString().trim().slice(0, 60),
      status: "pending",
      pendingId: pRef.id,
      createdAt: FieldValue.serverTimestamp(),
    };

    // Only update pendingNumbers here (DO NOT touch soldCount/status)
    tx.update(raffleRef, { pendingNumbers });

    return pRef.id;
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

  // NOTE: This query may require a composite index:
  // status == pending + createdAt desc
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
  if (!raffleId || !pendingId) {
    throw new HttpsError("invalid-argument", "Missing raffleId or pendingId.");
  }

  const raffleRef = db.collection("raffles").doc(String(raffleId));
  const pendingRef = raffleRef.collection("pending").doc(String(pendingId));

  // We'll capture data for the push notification AFTER approval succeeds
  let approvedUserUid = "";
  let approvedNumber = 0;

  await db.runTransaction(async (tx) => {
    const [raffleSnap, pendingSnap] = await Promise.all([
      tx.get(raffleRef),
      tx.get(pendingRef),
    ]);

    if (!raffleSnap.exists) throw new HttpsError("not-found", "Raffle not found.");
    if (!pendingSnap.exists) throw new HttpsError("not-found", "Pending request not found.");

    const raffle = raffleSnap.data() as any;
    const pending = pendingSnap.data() as any;

    if (raffle.status !== "open") {
      throw new HttpsError("failed-precondition", "Raffle is not open.");
    }
    if (pending.status !== "pending") {
      throw new HttpsError("failed-precondition", "Request is not pending.");
    }

    const total = Number(raffle.totalNumbers || 0);
    const number = Number(pending.number);

    if (!Number.isFinite(number) || number <= 0 || number > total) {
      throw new HttpsError("failed-precondition", "Invalid requested number.");
    }

    const reserved = (raffle.reserved || {}) as Record<string, any>;
    const pendingNumbers = (raffle.pendingNumbers || {}) as Record<string, any>;
    const key = String(number);

    // If already reserved, reject + free lock
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

    // Approve: move to reserved
    reserved[key] = {
      uid: pending.uid,
      name: pending.name || "User",
      approvedAt: FieldValue.serverTimestamp(),
      pendingId: pendingRef.id,
    };

    // Remove pending lock
    delete pendingNumbers[key];

    const soldCount = Number(raffle.soldCount || 0) + 1;
    const newStatus = soldCount >= total ? "sold_out" : "open";

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

    // Save for push after transaction
    approvedUserUid = String(pending.uid || "");
    approvedNumber = number;
  });

  // ✅ Send push notification AFTER success
  try {
    if (approvedUserUid) {
      const userDoc = await db.doc(`users/${approvedUserUid}`).get();
      const token = userDoc.data()?.fcmToken;

      if (token) {
        await getMessaging().send({
          token,
          notification: {
            title: "Reserved ✅",
            body: `Your number #${approvedNumber} is approved and reserved.`,
          },
          data: {
            type: "reservation_approved",
            raffleId: String(raffleId),
            number: String(approvedNumber),
          },
        });
      }
    }
  } catch (e) {
    // Don't fail approval if push fails
    console.error("FCM send failed:", e);
  }

  return { success: true };
});

/* ---------------- REJECT (ADMIN) ----------------
   Marks pending doc rejected and frees pending lock
-------------------------------------------------- */

export const rejectReservation = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Login required.");
  await requireAdmin(uid);

  const { raffleId, pendingId, reason } = request.data || {};
  if (!raffleId || !pendingId) {
    throw new HttpsError("invalid-argument", "Missing raffleId or pendingId.");
  }

  const raffleRef = db.collection("raffles").doc(String(raffleId));
  const pendingRef = raffleRef.collection("pending").doc(String(pendingId));

  const p = await pendingRef.get();
  if (!p.exists) throw new HttpsError("not-found", "Pending request not found.");

  const data = p.data() as any;
  if (data.status !== "pending") throw new HttpsError("failed-precondition", "Request is not pending.");

  await pendingRef.update({
    status: "rejected",
    rejectReason: (reason || "Rejected").toString().slice(0, 120),
    decidedAt: FieldValue.serverTimestamp(),
    decidedBy: uid,
  });

  // free lock on raffle doc
  const snap = await raffleRef.get();
  if (snap.exists) {
    const raffle = snap.data() as any;
    const pendingNumbers = (raffle.pendingNumbers || {}) as Record<string, any>;
    const key = String(data.number);
    delete pendingNumbers[key];
    await raffleRef.update({ pendingNumbers });
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
  if (raffle.status !== "sold_out") throw new HttpsError("failed-precondition", "Not sold out yet.");

  const numbers = Object.keys(raffle.reserved || {});
  if (numbers.length === 0) throw new HttpsError("failed-precondition", "No reserved numbers.");

  const winnerNumber = Number(numbers[Math.floor(Math.random() * numbers.length)]);
  const winnerName = raffle.reserved[String(winnerNumber)]?.name || "Winner";

  await raffleRef.update({
    status: "drawn",
    winnerNumber,
    winnerName,
    drawnAt: FieldValue.serverTimestamp(),
    drawnBy: uid,
  });

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
  if (raffle.status !== "drawn") {
    throw new HttpsError("failed-precondition", "Raffle must be DRAWN to re-draw.");
  }

  const numbers = Object.keys(raffle.reserved || {});
  if (numbers.length === 0) throw new HttpsError("failed-precondition", "No reserved numbers.");

  const winnerNumber = Number(numbers[Math.floor(Math.random() * numbers.length)]);
  const winnerName = raffle.reserved[String(winnerNumber)]?.name || "Winner";

  await raffleRef.update({
    winnerNumber,
    winnerName,
    redrawnAt: FieldValue.serverTimestamp(),
    redrawnBy: uid,
  });

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