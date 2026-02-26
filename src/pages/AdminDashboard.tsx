import React, { useEffect, useState } from "react";
import { IonContent, IonPage, IonToast } from "@ionic/react";
import { useHistory } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { auth, db, functions } from "../firebase";
import { collection, onSnapshot, orderBy, query, doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { onAuthStateChanged } from "firebase/auth";

type Raffle = {
  id: string;
  title: string;
  prize: string;
  pricePerNumber: number;
  totalNumbers: number;
  status: "open" | "sold_out" | "drawn";
};

async function isAdminClient(uid: string) {
  const snap = await getDoc(doc(db, "settings", "admin"));
  const uids = (snap.data()?.uids || []) as string[];
  return uids.includes(uid);
}

const AdminDashboard: React.FC = () => {
  const history = useHistory();
  const [toast, setToast] = useState("");
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [deletingId, setDeletingId] = useState<string>("");

  // ✅ single auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setAllowed(false);
        return;
      }
      try {
        const ok = await isAdminClient(u.uid);
        setAllowed(ok);
        if (!ok) setToast("Not authorized.");
      } catch {
        setAllowed(false);
        setToast("Could not verify admin.");
      }
    });

    return () => unsub();
  }, []);

  // ✅ listen raffles only if admin
  useEffect(() => {
    if (!allowed) return;

    const qy = query(collection(db, "raffles"), orderBy("createdAt", "desc"));
    return onSnapshot(qy, (snap) => {
      setRaffles(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
  }, [allowed]);

  const createNewRaffle = async () => {
    const title = prompt("Raffle title?")?.trim() || "";
    if (!title) return;

    const prize = (prompt("Prize description?") ?? "").trim() || "Prize";
    const totalNumbers = Number((prompt("How many numbers?") ?? "100").trim());
    const pricePerNumber = Number((prompt("Price per number?") ?? "5").trim());

    if (!Number.isFinite(totalNumbers) || totalNumbers <= 0) return setToast("Invalid total.");
    if (!Number.isFinite(pricePerNumber) || pricePerNumber < 0) return setToast("Invalid price.");

    try {
      const fn = httpsCallable(functions, "createRaffle");
      const res: any = await fn({ title, prize, totalNumbers, pricePerNumber });
      const raffleId = res?.data?.raffleId;
      if (raffleId) history.push(`/admin/raffles/${raffleId}`);
      else setToast("Created but missing raffleId.");
    } catch (e: any) {
      setToast(e?.message || "Create failed");
    }
  };

  const deleteRaffleClient = async (raffleId: string) => {
    const ok = window.confirm("Delete this raffle? This cannot be undone.");
    if (!ok) return;

    setDeletingId(raffleId);
    try {
      const fn = httpsCallable(functions, "deleteRaffle");
      await fn({ raffleId });
      setToast("Raffle deleted.");
    } catch (e: any) {
      setToast(e?.message || "Delete failed.");
    } finally {
      setDeletingId("");
    }
  };

  if (allowed === null) return null;

  if (!allowed) {
    return (
      <IonPage>
        <AppHeader />
        <IonContent className="hm-content hm-camo">
          <div className="hm-wrap" style={{ padding: 20 }}>
            <div className="hm-auth-card">
              <h2>Admin</h2>
              <p style={{ opacity: 0.8 }}>You are not authorized to view this page.</p>
              <button className="pd-primary" onClick={() => history.push("/home")} type="button">
                Go Home
              </button>
            </div>
          </div>

          <IonToast isOpen={!!toast} message={toast} duration={1800} onDidDismiss={() => setToast("")} />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <AppHeader />
      <IonContent className="hm-content hm-camo">
        <div className="hm-wrap" style={{ padding: 20 }}>
          <div className="hm-auth-card" style={{ maxWidth: 980, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 1100, fontSize: 20 }}>Admin Dashboard</div>
                <div style={{ opacity: 0.75, marginTop: 4 }}>Create raffles and approve Wish payments.</div>
              </div>
              <button className="pd-primary" onClick={createNewRaffle} type="button">
                + New Raffle
              </button>
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {raffles.length === 0 ? (
                <div style={{ opacity: 0.75 }}>No raffles yet.</div>
              ) : (
                raffles.map((r) => (
                  <div
                    key={r.id}
                    className="addr-card"
                    style={{ cursor: "pointer" }}
                    onClick={() => history.push(`/admin/raffles/${r.id}`)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontWeight: 1100 }}>{r.title}</div>
                        <div style={{ opacity: 0.85 }}>Prize: {r.prize}</div>
                        <div style={{ opacity: 0.85 }}>
                          ${Number(r.pricePerNumber).toFixed(2)} • {r.totalNumbers} numbers
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 1000, opacity: 0.9 }}>
                          {r.status === "open" ? "OPEN" : r.status === "sold_out" ? "SOLD OUT" : "DRAWN"}
                        </div>

                        {/* ✅ delete per raffle */}
                        <button
                          className="pd-secondary"
                          type="button"
                          disabled={deletingId === r.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRaffleClient(r.id);
                          }}
                        >
                          {deletingId === r.id ? "Deleting..." : "🗑 Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <IonToast isOpen={!!toast} message={toast} duration={1800} onDidDismiss={() => setToast("")} />
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard;