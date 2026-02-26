import React, { useEffect, useMemo, useState } from "react";
import { IonAlert, IonContent, IonPage, IonToast } from "@ionic/react";
import { useHistory, useParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "../firebase";
import confetti from "canvas-confetti";

async function isAdminUid(uid: string) {
  const snap = await getDoc(doc(db, "settings", "admin"));
  const uids = (snap.data()?.uids || []) as string[];
  return uids.includes(uid);
}

const RaffleDetails: React.FC = () => {
  const { raffleId } = useParams<{ raffleId: string }>();
  const history = useHistory();

  const [raffle, setRaffle] = useState<any>(null);
  const [toast, setToast] = useState("");

  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  const [amIAdmin, setAmIAdmin] = useState(false);
  const [okPopup, setOkPopup] = useState<{ title: string; msg: string } | null>(null);

  // slot animation state
  const [rolling, setRolling] = useState(false);
  const [rollNumber, setRollNumber] = useState<number | null>(null);
  const [lastWinner, setLastWinner] = useState<{ number: number; name: string } | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setAmIAdmin(false);
        return;
      }
      try {
        setAmIAdmin(await isAdminUid(u.uid));
      } catch {
        setAmIAdmin(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const ref = doc(db, "raffles", raffleId);
    return onSnapshot(ref, (snap) => {
      setRaffle(snap.exists() ? snap.data() : null);
    });
  }, [raffleId]);

  const reserved = raffle?.reserved || {};
  const pendingNumbers = raffle?.pendingNumbers || {};
  const myUid = auth.currentUser?.uid;
  const soldCount = raffle?.soldCount ?? Object.keys(reserved).length;
  const total = Number(raffle?.totalNumbers || 0);
  const percent = total > 0 ? Math.round((soldCount / total) * 100) : 0;

  const numbers = useMemo(() => {
    if (!total || total <= 0) return [];
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [total]);

  if (!raffle) return null;

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
    setRolling(true);
    setRollNumber(Math.floor(Math.random() * total) + 1);

    const start = Date.now();
    const duration = 2000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);

      // looks like easing-out (still smooth)
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

  const drawWinner = async () => {
    try {
      const fn = httpsCallable(functions, "drawWinner");
      const res: any = await fn({ raffleId });

      const winnerNumber = Number(res?.data?.winnerNumber);
      const winnerName = String(res?.data?.winnerName || "Winner");

      await runSlotRoll(winnerNumber, winnerName);
    } catch (e: any) {
      setToast(e?.message || "Draw failed.");
    }
  };

  const redrawWinner = async () => {
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

  const replayWinnerAnimation = async () => {
    const winnerNumber = Number(raffle.winnerNumber ?? lastWinner?.number);
    const winnerName = String(raffle.winnerName ?? lastWinner?.name ?? "Winner");
    if (!winnerNumber) return setToast("No winner to replay yet.");
    await runSlotRoll(winnerNumber, winnerName);
  };

  return (
    <IonPage>
      <AppHeader showBack backHref="/raffles" />
      <IonContent className="hm-content hm-camo">
        <div className="hm-wrap" style={{ padding: 20 }}>
          <div className="hm-auth-card">
            <h2 style={{ marginTop: 0 }}>{raffle.title}</h2>

            {/* Progress */}
            <div style={{ marginTop: 16 }}>
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

            <p style={{ marginTop: 10 }}>Prize: {raffle.prize}</p>

            {/* Numbers grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(20, 1fr)",
                gap: 12,
                marginTop: 18,
              }}
            >
              {numbers.map((num) => {
  const reservedInfo = reserved[String(num)] || reserved[num];
  const pendingInfo = pendingNumbers[String(num)] || pendingNumbers[num];

  const taken = !!reservedInfo;
  const pending = !!pendingInfo && pendingInfo.status === "pending";

  const mineTaken = taken && reservedInfo?.uid === myUid;
  const minePending = pending && pendingInfo?.uid === myUid;

  const displayName = (taken ? reservedInfo?.name : pending ? pendingInfo?.name : "") || "";

  const canClick = raffle.status === "open" && !taken && !pending;

  return (
    <div
      key={num}
      onClick={() => {
        if (!canClick) return;

        if (!auth.currentUser) {
          setToast("Please log in first.");
          history.push("/login", { from: `/raffles/${raffleId}` } as any);
          return;
        }

        setSelectedNumber(num);
        setShowPayment(true);
      }}
      style={{
  padding: 10,
  minHeight: 80,
  borderRadius: 10,
  textAlign: "center",
  fontWeight: 800,
  fontSize: 14,
  cursor: canClick ? "pointer" : "default",
  background: taken
    ? mineTaken
      ? "linear-gradient(135deg,#2ecc71,#27ae60)"
      : "linear-gradient(135deg,#555,#333)"
    : pending
      ? minePending
        ? "linear-gradient(135deg,#f1c40f,#d4ac0d)"
        : "linear-gradient(135deg,#6b5b00,#3a3200)"
      : "linear-gradient(135deg,#1e1e1e,#111)",
  border: "1px solid #333",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
}}
      onMouseEnter={(e) => {
        if (canClick) {
          e.currentTarget.style.transform = "scale(1.05)";
          e.currentTarget.style.boxShadow = "0 6px 14px rgba(0,0,0,0.4)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 900 }}>{num}</div>

{taken || pending ? (
  <>
    <div
      style={{
        marginTop: 4,
        fontSize: 10,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      title={displayName}
    >
      {displayName}
    </div>

    <div
      style={{
        fontSize: 9,
        marginTop: 3,
        opacity: 0.9,
        whiteSpace: "nowrap",
      }}
    >
      {taken ? "🔒 Taken" : "⏳ Pending"}
    </div>
  </>
) : (
  <div style={{ fontSize: 9, marginTop: 4, opacity: 0.6 }}>
    Available
  </div>
)}
    </div>
  );
})}
            </div>

            {/* Payment box */}
            {showPayment && selectedNumber !== null && (
              <div
                style={{
                  background: "#111",
                  padding: 20,
                  minHeight: 110,
                  borderRadius: 14,
                  marginTop: 24,
                  border: "1px solid #333",
                }}
              >
                <h4 style={{ marginBottom: 10 }}>
                  Send ${raffle.pricePerNumber} via Wish Money
                </h4>

                <p style={{ margin: 4 }}>
                  Transfer to: <strong>70XXXXXX</strong>
                </p>
                <p style={{ margin: 4 }}>
                  Reference: <strong>{raffleId}-{selectedNumber}</strong>
                </p>

                <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    className="pd-primary"
                    onClick={async () => {
                      try {
                        if (!auth.currentUser) {
                          setToast("Please log in first.");
                          history.push("/login", { from: `/raffles/${raffleId}` } as any);
                          return;
                        }

                        const fn = httpsCallable(functions, "requestReservation");
                        await fn({
                          raffleId,
                          number: selectedNumber,
                          name: auth.currentUser?.displayName || "User",
                        });

                        setShowPayment(false);
                        setSelectedNumber(null);

                        setOkPopup({
                          title: "Submitted ✅",
                          msg: "Payment submitted. Waiting for admin approval.",
                        });
                      } catch (e: any) {
                        setToast(e?.message || "Submit failed.");
                      }
                    }}
                    type="button"
                  >
                    I Have Paid
                  </button>

                  <button
                    className="pd-secondary"
                    onClick={() => {
                      setShowPayment(false);
                      setSelectedNumber(null);
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* SLOT MACHINE DRAW UI */}
            <div
              style={{
                marginTop: 22,
                padding: 16,
                borderRadius: 16,
                background: "linear-gradient(135deg,#111,#0b0b0b)",
                border: "1px solid #2a2a2a",
                textAlign: "center",
              }}
            >
              <div style={{ fontWeight: 1000, opacity: 0.8 }}>🎥 Slot Draw</div>

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
                {/* Admin-only draw (only meaningful when sold_out) */}
                {amIAdmin && raffle.status === "sold_out" ? (
                  <button className="pd-primary" onClick={drawWinner} disabled={rolling} type="button">
                    🎰 Draw Winner
                  </button>
                ) : null}

                {/* Replay (admin-only) */}
                {amIAdmin && raffle.status === "drawn" ? (
                  <button className="pd-secondary" onClick={replayWinnerAnimation} disabled={rolling} type="button">
                    🔁 Replay
                  </button>
                ) : null}

                {/* Re-draw (admin-only) */}
                {amIAdmin && raffle.status === "drawn" ? (
                  <button className="pd-secondary" onClick={redrawWinner} disabled={rolling} type="button">
                    ♻️ Re-draw Winner
                  </button>
                ) : null}
              </div>

              {!amIAdmin && raffle.status === "drawn" ? (
                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                  Winner already drawn.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <IonAlert
  isOpen={!!okPopup}
  header={okPopup?.title}
  message={okPopup?.msg}
  buttons={[
    {
      text: "OK",
      role: "confirm",
      handler: () => setOkPopup(null),
    },
  ]}
  onDidDismiss={() => setOkPopup(null)}
/>

        <IonToast isOpen={!!toast} message={toast} duration={2200} onDidDismiss={() => setToast("")} />
      </IonContent>
    </IonPage>
  );
};

export default RaffleDetails;