import React, { useMemo, useState, useEffect } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonText,
  IonToast,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { notifyCartUpdated } from "../utils/cartBus"; // ✅ add this

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  storeId: string;
  storeName: string;
  size?: string;
  type?: "normal" | "reserve";
};

const Cart: React.FC = () => {
  const history = useHistory();
  const [toast, setToast] = useState<string | null>(null);

  const isLoggedIn = localStorage.getItem("hm_logged_in") === "1";

  // ✅ use state, not useMemo([])
  const [cart, setCart] = useState<CartItem[]>([]);

  // ✅ load cart on enter/mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("hm_cart");
      setCart(raw ? (JSON.parse(raw) as CartItem[]) : []);
    } catch {
      setCart([]);
    }
  }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, { storeName: string; items: CartItem[] }>();
    for (const it of cart) {
      const key = it.storeId;
      const prev = m.get(key);
      if (!prev) m.set(key, { storeName: it.storeName, items: [it] });
      else prev.items.push(it);
    }
    return Array.from(m.entries()).map(([storeId, v]) => ({ storeId, ...v }));
  }, [cart]);

  const deliveryFee = 5;
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal + (cart.length ? deliveryFee : 0);

  const checkout = () => {
    if (!cart.length) {
      setToast("Cart is empty.");
      return;
    }
    if (!isLoggedIn) {
      history.push("/login", { from: "/checkout" } as any);
      return;
    }
    history.push("/checkout");
  };

  const clear = () => {
  localStorage.setItem("hm_cart", "[]"); // better than removeItem
  notifyCartUpdated();                   // 🔥 THIS is the key
  setToast("Cart cleared.");
  setTimeout(() => history.replace("/home"), 600);
};

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Cart</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="hm-content ion-padding">
        <div className="hm-auth-card" style={{ maxWidth: 960 }}>
          {!cart.length ? (
            <>
              <IonText>
                <h2 style={{ marginTop: 0 }}>Your cart is empty</h2>
              </IonText>
              <IonButton expand="block" onClick={() => history.push("/home")}>
                Continue shopping
              </IonButton>
            </>
          ) : (
            <>
              <IonText>
                <h2 style={{ marginTop: 0 }}>Your cart</h2>
              </IonText>

              {grouped.map((g) => (
                <div key={g.storeId} style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 900 }}>{g.storeName}</div>
                  <div style={{ opacity: 0.75, fontSize: 13 }}>Items prepared by store</div>

                  <div style={{ marginTop: 8 }}>
                    {g.items.map((it, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "10px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {it.name} {it.size ? `(${it.size})` : ""}{" "}
                            {it.type === "reserve" ? "• Reserve" : ""}
                          </div>
                          <div style={{ opacity: 0.75, fontSize: 13 }}>Qty: {it.qty}</div>
                        </div>
                        <div style={{ fontWeight: 900, color: "var(--hm-accent-2)" }}>
                          ${(it.price * it.qty).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", opacity: 0.9 }}>
                  <span>Subtotal</span>
                  <strong>${subtotal.toFixed(2)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", opacity: 0.9 }}>
                  <span>Delivery fee (fixed)</span>
                  <strong>${deliveryFee.toFixed(2)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontWeight: 800 }}>Total</span>
                  <span style={{ fontWeight: 900, color: "var(--hm-accent-2)" }}>
                    ${total.toFixed(2)}
                  </span>
                </div>
                <IonText style={{ display: "block", marginTop: 8, opacity: 0.75, fontSize: 13 }}>
                  COD only. If a store rejects items, we deliver the rest.
                </IonText>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <IonButton expand="block" onClick={checkout} style={{ flex: 1, minWidth: 220 }}>
                  Proceed to Checkout
                </IonButton>
                <IonButton
                  expand="block"
                  fill="outline"
                  onClick={clear}
                  style={{ flex: 1, minWidth: 220 }}
                >
                  Clear cart
                </IonButton>
              </div>
            </>
          )}
        </div>

        <IonToast
          isOpen={!!toast}
          message={toast ?? ""}
          duration={1400}
          onDidDismiss={() => setToast(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Cart;