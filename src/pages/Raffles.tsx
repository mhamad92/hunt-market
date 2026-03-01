import React, { useEffect, useState } from "react";
import { IonContent, IonPage, IonToast } from "@ionic/react";
import { useHistory } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { useIsAdmin } from "../lib/admin";

type Raffle = {
  id: string;
  title: string;
  prize: string;
  pricePerNumber: number;
  totalNumbers: number;
  status: "open" | "sold_out" | "drawn";
  winnerNumber?: number;
  winnerName?: string;
};

const Raffles: React.FC = () => {
  const history = useHistory();
  const [toast, setToast] = useState<string>("");

  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const { loading: adminLoading, isAdmin } = useIsAdmin();

  useEffect(() => {
    const qy = query(collection(db, "raffles"), orderBy("createdAt", "desc"));
    return onSnapshot(
      qy,
      (snap) => {
        const list: Raffle[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setRaffles(list);
      },
      (err) => {
        console.error("raffles snapshot error:", err);
        setToast(err?.message || "Could not load raffles.");
      }
    );
  }, []);

  return (
    <IonPage>
      <AppHeader showBack backHref="/home" />
      <IonContent fullscreen className="hm-content hm-camo">
        <div className="hm-wrap" style={{ paddingTop: 14, paddingBottom: 26 }}>
          <div className="hm-auth-card" style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 1100, fontSize: 20 }}>Raffles</div>
                <div style={{ opacity: 0.75, marginTop: 4 }}>Reserve a number. When sold out, winner is drawn.</div>
              </div>

              {!adminLoading && isAdmin ? (
                <button className="pd-primary" type="button" onClick={() => history.push("/admin")}>
                  Admin Dashboard
                </button>
              ) : null}
            </div>

            <div className="addr-list" style={{ marginTop: 12 }}>
              {raffles.length === 0 ? (
                <div style={{ opacity: 0.75 }}>No raffles yet.</div>
              ) : (
                raffles.map((r) => (
                  <div
                    key={r.id}
                    className="addr-card"
                    style={{ cursor: "pointer" }}
                    onClick={() => history.push(`/raffles/${r.id}`)}
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
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 1000, opacity: 0.9 }}>
                            {r.status === "open" ? "OPEN" : r.status === "sold_out" ? "SOLD OUT" : "DRAWN"}
                          </div>

                          {r.status === "drawn" ? (
                            <div style={{ opacity: 0.85, marginTop: 6 }}>
                              Winner: #{r.winnerNumber} • {r.winnerName || "—"}
                            </div>
                          ) : null}
                        </div>

                        {/* optional Manage button for admin */}
                        {!adminLoading && isAdmin ? (
                          <button
                            className="pd-secondary"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              history.push(`/admin/raffles/${r.id}`);
                            }}
                          >
                            Manage
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <IonToast isOpen={!!toast} message={toast} duration={1600} onDidDismiss={() => setToast("")} />
      </IonContent>
    </IonPage>
  );
};

export default Raffles;