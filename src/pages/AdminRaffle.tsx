import React, { useEffect, useMemo, useState } from "react";
import { IonContent, IonPage, IonToast } from "@ionic/react";
import { useHistory, useParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { auth, db, functions } from "../firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import confetti from "canvas-confetti";

type PendingItem = {
  id: string;
  uid: string;
  name: string;
  number: number;
  status: "pending" | "approved" | "rejected";
  reference?: string;
};

async function isAdminUid(uid: string) {
  const snap = await getDoc(doc(db, "settings", "admin"));
  const uids = (snap.data()?.uids || []) as string[];
  return uids.includes(uid);
}

const AdminRaffle: React.FC = () => {
  const { raffleId } = useParams<{ raffleId: string }>();
  const history = useHistory();

  const [toast, setToast] = useState("");
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const [raffle, setRaffle] = useState<any>(null);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [busyId, setBusyId] = useState<string>("");

  // 🎰 Slot animation
  const [rolling, setRolling] = useState(false);
  const [rollNumber, setRollNumber] = useState<number | null>(null);
  const [lastWinner, setLastWinner] = useState<{ number: number; name: string } | null>(null);

  // admin gate
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setAllowed(false);
        return;
      }
      try {
        setAllowed(await isAdminUid(u.uid));
      } catch {
        setAllowed(false);
      }
    });
    return () => unsub();
  }, []);

  // raffle live
  useEffect(() => {
    const ref = doc(db, "raffles", raffleId);
    return onSnapshot(ref, (snap) => {
      setRaffle(snap.exists() ? snap.data() : null);
    });
  }, [raffleId]);

  const reserved = raffle?.reserved || {};
  const pendingNumbers = raffle?.pendingNumbers || {};
  const total = Number(raffle?.totalNumbers || 0);
  const soldCount = raffle?.soldCount ?? Object.keys(reserved).length;
  const percent = total > 0 ? Math.round((soldCount / total) * 100) : 0;

  const numbers = useMemo(() => {
    if (!total || total <= 0) return [];
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [total]);

  const refreshPending = async () => {
    try {
      const fn = httpsCallable(functions, "listPendingReservations");
      const res: any = await fn({ raffleId });
      setPending((res?.data?.items || []) as PendingItem[]);
    } catch (e: any) {
      setToast(e?.message || "Could not load pending requests.");
    }
  };

  useEffect(() => {
    if (allowed) refreshPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, raffleId]);

  // 🔊 + ✨ helpers
  const playWinSound = () => {
    try {
      const a = new Audio("/sounds/win.mp3");
      a.volume = 0.85;
      a.play().catch(() => {});
    } catch {}
  };

  const fireConfetti = () => {
    try {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 90, spread: 95, origin: { y: 0.55 } }), 250);
    } catch {}
  };

  const runSlotRoll = async (finalNumber: number, finalName: string) => {
    if (!total || total <= 0) return;

    setRolling(true);
    setRollNumber(Math.floor(Math.random() * total) + 1);

    const start = Date.now();
    const duration = 2000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);

      setRollNumber(Math.floor(Math.random() * total) + 1);

      if (t >= 1) {
        clearInterval(interval);
        setRollNumber(finalNumber);
        setLastWinner({ number: finalNumber, name: finalName });
        playWinSound();
        fireConfetti();
        setRolling(false);
      }
    }, 60);
  };

  const approve = async (pendingId: string) => {
    setBusyId(pendingId);
    try {
      const fn = httpsCallable(functions, "approveReservation");
      await fn({ raffleId, pendingId });
      setToast("Approved ✅");
      await refreshPending();
    } catch (e: any) {
      setToast(e?.message || "Approve failed.");
    } finally {
      setBusyId("");
    }
  };

  const reject = async (pendingId: string) => {
    const reason = prompt("Reject reason? (optional)") ?? "";
    setBusyId(pendingId);
    try {
      const fn = httpsCallable(functions, "rejectReservation");
      await fn({ raffleId, pendingId, reason });
      setToast("Rejected ❌");
      await refreshPending();
    } catch (e: any) {
      setToast(e?.message || "Reject failed.");
    } finally {
      setBusyId("");
    }
  };

  const deleteThisRaffle = async () => {
    const ok = window.confirm("Delete this raffle? This cannot be undone.");
    if (!ok) return;

    try {
      const fn = httpsCallable(functions, "deleteRaffle");
      await fn({ raffleId });
      setToast("Raffle deleted.");
      history.replace("/admin");
    } catch (e: any) {
      setToast(e?.message || "Delete failed.");
    }
  };

  const drawWinnerNow = async () => {
    const ok = window.confirm("Draw winner now?");
    if (!ok) return;

    try {
      const fn = httpsCallable(functions, "drawWinner");
      const res: any = await fn({ raffleId });

      const winnerNumber = Number(res?.data?.winnerNumber);
      const winnerName = String(res?.data?.winnerName || "Winner");

      await runSlotRoll(winnerNumber, winnerName);
      setToast(`Winner: #${winnerNumber} • ${winnerName}`);
    } catch (e: any) {
      setToast(e?.message || "Draw failed.");
    }
  };

  const redrawWinnerNow = async () => {
    const ok = window.confirm("Re-draw a different winner? (Admin only)");
    if (!ok) return;

    try {
      const fn = httpsCallable(functions, "redrawWinner");
      const res: any = await fn({ raffleId });

      const winnerNumber = Number(res?.data?.winnerNumber);
      const winnerName = String(res?.data?.winnerName || "Winner");

      await runSlotRoll(winnerNumber, winnerName);
      setToast(`Re-drawn: #${winnerNumber} • ${winnerName}`);
    } catch (e: any) {
      setToast(e?.message || "Re-draw failed.");
    }
  };

  const replayAnimation = async () => {
    const winnerNumber = Number(raffle?.winnerNumber ?? lastWinner?.number);
    const winnerName = String(raffle?.winnerName ?? lastWinner?.name ?? "Winner");
    if (!winnerNumber) return setToast("No winner to replay yet.");
    await runSlotRoll(winnerNumber, winnerName);
  };

  if (allowed === null) return null;

  if (!allowed) {
    return (
      <IonPage>
        <AppHeader />
        <IonContent className="hm-content hm-camo">
          <div className="hm-wrap" style={{ padding: 20 }}>
            <div className="hm-auth-card" style={{ maxWidth: 720, margin: "0 auto" }}>
              <div style={{ fontWeight: 1100, fontSize: 18 }}>Not authorized</div>
              <div style={{ opacity: 0.8, marginTop: 8 }}>This page is admin-only.</div>
              <button className="pd-secondary" style={{ marginTop: 12 }} onClick={() => history.replace("/home")}>
                Go home
              </button>
            </div>
          </div>
          <IonToast isOpen={!!toast} message={toast} duration={1800} onDidDismiss={() => setToast("")} />
        </IonContent>
      </IonPage>
    );
  }

  if (!raffle) return null;

  return (
    <IonPage>
      <AppHeader />
      <IonContent className="hm-content hm-camo">
        <div className="hm-wrap" style={{ padding: 20 }}>
          <div className="hm-auth-card" style={{ maxWidth: 980, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 1100, fontSize: 20 }}>{raffle.title}</div>
                <div style={{ opacity: 0.8, marginTop: 4 }}>
                  {soldCount}/{total} sold • ${Number(raffle.pricePerNumber).toFixed(2)} each
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="pd-secondary" onClick={() => history.push(`/raffles/${raffleId}`)} type="button">
                  View public
                </button>
                <button className="pd-secondary" onClick={() => history.push("/admin")} type="button">
                  Back
                </button>
                <button className="pd-secondary" onClick={deleteThisRaffle} type="button">
                  🗑 Delete
                </button>
              </div>
            </div>

            {/* progress */}
            <div style={{ marginTop: 14 }}>
              <div style={{ height: 12, background: "#333", borderRadius: 8, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${percent}%`,
                    height: "100%",
                    background: percent === 100 ? "#e63946" : "#2ecc71",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
                {soldCount} / {total} sold ({percent}%)
              </div>
            </div>

            {/* 🎥 Slot machine draw box */}
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 16,
                background: "linear-gradient(135deg,#111,#0b0b0b)",
                border: "1px solid #2a2a2a",
                textAlign: "center",
              }}
            >
              <div style={{ fontWeight: 1000, opacity: 0.85 }}>🎥 Slot Draw</div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 42,
                  fontWeight: 1100,
                  letterSpacing: 2,
                  transform: rolling ? "scale(1.03)" : "scale(1)",
                  transition: "transform 0.15s ease",
                }}
              >
                #{rollNumber ?? raffle.winnerNumber ?? "—"}
              </div>

              <div style={{ marginTop: 6, opacity: 0.85 }}>
                {rolling ? "Rolling..." : raffle.status === "drawn" ? (raffle.winnerName || "—") : "—"}
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                {raffle.status === "sold_out" ? (
                  <button className="pd-primary" onClick={drawWinnerNow} disabled={rolling} type="button">
                    🎰 Draw Winner
                  </button>
                ) : null}

                {raffle.status === "drawn" ? (
                  <>
                    <button className="pd-secondary" onClick={replayAnimation} disabled={rolling} type="button">
                      🔁 Replay
                    </button>
                    <button className="pd-secondary" onClick={redrawWinnerNow} disabled={rolling} type="button">
                      ♻️ Re-draw Winner
                    </button>
                  </>
                ) : null}
              </div>

              {raffle.status === "open" ? (
                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                  Draw becomes available when the raffle is SOLD OUT.
                </div>
              ) : null}
            </div>

            {/* ✅ Numbers grid (shows Reserved + Pending) */}
<div
  style={{
    display: "grid",
    // ✅ 20 per row (admin)
    gridTemplateColumns: "repeat(auto-fill, minmax(42px, 1fr))",
    gap: 8,
    marginTop: 16,
  }}
>
  {numbers.map((num) => {
    const key = String(num);

    const reservedInfo = reserved[key] || reserved[num];
    const pendingInfo = pendingNumbers[key];

    const isReserved = !!reservedInfo;
    const isPending = !!pendingInfo && pendingInfo.status === "pending";

    const labelName = isReserved
      ? (reservedInfo?.name || "—")
      : isPending
      ? (pendingInfo?.name || "—")
      : "";

    const statusLabel = isReserved ? "Reserved" : isPending ? "Awaiting approval" : "Available";

    return (
      <div
        key={num}
        style={{
          padding: 10,
          borderRadius: 12,
          textAlign: "center",
          fontWeight: 900,
          fontSize: 14,
          lineHeight: 1.1,
          background: isReserved
            ? "linear-gradient(135deg,#555,#333)"
            : isPending
            ? "linear-gradient(135deg,#2b2b1a,#14140d)" // pending tint
            : "linear-gradient(135deg,#1e1e1e,#111)",
          border: isReserved
            ? "2px solid #444"
            : isPending
            ? "2px solid #6b5f2a"
            : "2px solid #222",
          position: "relative",
        }}
        title={
          isReserved
            ? `Reserved by ${labelName}`
            : isPending
            ? `Awaiting approval: ${labelName}`
            : "Available"
        }
      >
        {/* number */}
        <div style={{ fontWeight: 1000, fontSize: 14 }}>{num}</div>

        {/* pending clock */}
        {isPending ? (
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              fontSize: 12,
              opacity: 0.95,
            }}
            aria-label="Pending"
            title="Awaiting approval"
          >
            🕒
          </div>
        ) : null}

        {/* label line (full, no cut) */}
        <div
          style={{
            marginTop: 6,
            fontSize: 10,
            fontWeight: 900,
            opacity: 0.92,
            whiteSpace: "normal",      // ✅ allow wrap
            overflow: "visible",       // ✅ no cut
            textOverflow: "clip",      // ✅ no ellipsis
            wordBreak: "break-word",   // ✅ long names wrap
          }}
        >
          {isReserved || isPending ? labelName : "—"}
        </div>

        {/* status line */}
        <div
          style={{
            marginTop: 3,
            fontSize: 9,
            opacity: 0.75,
            whiteSpace: "normal",
            wordBreak: "break-word",
          }}
        >
          {statusLabel}
        </div>
      </div>
    );
  })}
</div>

            {/* Pending payments */}
            <div style={{ marginTop: 18, padding: 16, borderRadius: 14, border: "1px solid #333", background: "#111" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 1100 }}>Pending Wish Payments</div>
                <button className="pd-secondary" type="button" onClick={refreshPending}>
                  Refresh
                </button>
              </div>

              {pending.length === 0 ? (
                <div style={{ opacity: 0.75, marginTop: 8 }}>No pending requests.</div>
              ) : (
                <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                  {pending.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid #2a2a2a",
                        background: "#0d0d0d",
                      }}
                    >
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={{ fontWeight: 1000 }}>
                          #{p.number} • {p.name || "User"}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          Ref: {p.reference || `${raffleId}-${p.number}`}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <button
                          className="pd-primary"
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => approve(p.id)}
                        >
                          Approve
                        </button>
                        <button
                          className="pd-secondary"
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => reject(p.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <IonToast isOpen={!!toast} message={toast} duration={2000} onDidDismiss={() => setToast("")} />
      </IonContent>
    </IonPage>
  );
};

export default AdminRaffle;