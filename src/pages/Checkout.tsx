import React, { useMemo, useState, useEffect } from "react";
import {
  IonPage,
  IonContent,
  IonItem,
  IonLabel,
  IonTextarea,
  IonButton,
  IonText,
  IonToast,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import AppHeader from "../components/AppHeader";

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  storeId: string;
  storeName: string;
};

type ProfileData = {
  fullName: string;
  phone: string;
  email: string;
};

type Address = {
  id: string;
  label: string;
  city: string;
  area: string;
  street: string;
  building?: string;
  floor?: string;
  notes?: string;
  isDefault?: boolean;
};

const PROFILE_KEY = "hm_profile";
const ADDR_KEY = "hm_addresses";

function readProfile(): ProfileData {
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

function readAddresses(): Address[] {
  try {
    const raw = localStorage.getItem(ADDR_KEY);
    return raw ? (JSON.parse(raw) as Address[]) : [];
  } catch {
    return [];
  }
}

function formatAddr(a: Address) {
  const main = `${a.city}, ${a.area}, ${a.street}`;
  const b = a.building ? `, ${a.building}` : "";
  const f = a.floor ? `, Floor ${a.floor}` : "";
  return `${a.label} • ${main}${b}${f}`;
}

const Checkout: React.FC = () => {
  const history = useHistory();
  const isLoggedIn = localStorage.getItem("hm_logged_in") === "1";

  const [toast, setToast] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileData>(() => readProfile());
  const [addresses, setAddresses] = useState<Address[]>(() => readAddresses());
  const [selectedAddrId, setSelectedAddrId] = useState<string>("");

  const [notes, setNotes] = useState("");

  const cart: CartItem[] = useMemo(() => {
    const raw = localStorage.getItem("hm_cart");
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      history.replace("/login", { from: "/checkout" } as any);
      return;
    }

    const p = readProfile();
    const a = readAddresses();

    setProfile(p);
    setAddresses(a);

    // pick default address (or first)
    const picked = a.find((x) => x.isDefault)?.id ?? a[0]?.id ?? "";
    setSelectedAddrId((prev) => prev || picked);
  }, [isLoggedIn, history]);

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddrId) || null,
    [addresses, selectedAddrId]
  );

  const fullNameLocked = profile.fullName.trim();
  const phoneLocked = profile.phone.trim();

  const deliveryFee = 5;
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal + (cart.length ? deliveryFee : 0);

  const placeOrder = async () => {
    if (!cart.length) return setToast("Cart is empty.");

    if (!fullNameLocked) return setToast("Please add your full name in Profile first.");
    if (!phoneLocked) return setToast("Please add your phone number in Profile first.");
    if (!selectedAddress) return setToast("Please add/select a delivery address in Profile.");

    // you can keep this if later you want to send it to backend
    const deliveryAddressText = formatAddr(selectedAddress);
    void deliveryAddressText;

    localStorage.removeItem("hm_cart");
    window.dispatchEvent(new Event("hm_cart_updated"));
    setToast("Order placed (COD). Stores will confirm soon.");

    setTimeout(() => history.replace("/home"), 900);
  };

  return (
    <IonPage>
      <AppHeader />

      <IonContent fullscreen className="hm-content hm-camo">
        <div className="hm-hero hm-camo" style={{ paddingBottom: 18 }}>
          <div className="hm-wrap hm-hero-inner">
            <div className="hm-hero-kicker">
              <span className="hm-dot" /> CHECKOUT
            </div>
            <h1 className="hm-hero-title">
              CASH ON <span>DELIVERY.</span>
            </h1>
            <p className="hm-hero-sub">Confirm your delivery info and place the order.</p>
          </div>
        </div>

        <div className="hm-wrap">
          <div className="hm-auth-card">
            <IonText>
              <h2 style={{ marginTop: 0, marginBottom: 6, fontWeight: 1100 }}>Delivery details</h2>
              <p style={{ marginTop: 0, opacity: 0.75, fontWeight: 850 }}>
                Payment method: <strong>Cash on Delivery</strong>
              </p>
            </IonText>

            {/* CUSTOMER SUMMARY BLOCK */}
            <div className="hm-filterbar" style={{ marginTop: 12, padding: 14, borderRadius: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 1100, fontSize: 14, opacity: 0.85 }}>Customer</div>
                  <div style={{ fontWeight: 1100, fontSize: 18, marginTop: 4 }}>
                    {fullNameLocked || "—"}
                  </div>
                  <div style={{ opacity: 0.85, marginTop: 4 }}>{phoneLocked || "—"}</div>
                </div>

                <button
                  className="pd-secondary"
                  type="button"
                  onClick={() => history.push("/profile")}
                  style={{ height: 42 }}
                >
                  Edit in Profile
                </button>
              </div>
            </div>

            {/* DELIVERY ADDRESS BLOCK */}
            <div className="hm-filterbar" style={{ marginTop: 12, padding: 14, borderRadius: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 1100, fontSize: 14, opacity: 0.85 }}>Delivery address</div>
                  <div style={{ opacity: 0.85, marginTop: 6, lineHeight: 1.4 }}>
                    {selectedAddress ? formatAddr(selectedAddress) : "No saved addresses yet."}
                  </div>
                </div>

                <button
                  className="pd-secondary"
                  type="button"
                  onClick={() => history.push("/profile")}
                  style={{ height: 42 }}
                >
                  Manage
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                <IonItem lines="none" className="hm-field">
                  <IonLabel position="stacked">Choose a saved address</IonLabel>

                  {/* Using a native select styled with .profile-input (add CSS if needed) */}
                  <select
                    className="profile-input"
                    value={selectedAddrId}
                    onChange={(e) => setSelectedAddrId(e.target.value)}
                    disabled={addresses.length === 0}
                  >
                    {addresses.length === 0 ? (
                      <option value="">No saved addresses</option>
                    ) : (
                      addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {formatAddr(a)}
                        </option>
                      ))
                    )}
                  </select>
                </IonItem>
              </div>
            </div>

            {/* NOTES */}
            <IonItem lines="none" className="hm-field" style={{ marginTop: 12 }}>
              <IonLabel position="stacked">Notes (optional)</IonLabel>
              <IonTextarea
                value={notes}
                placeholder="Floor, landmark, call before..."
                onIonInput={(e) => setNotes(e.detail.value ?? "")}
              />
            </IonItem>

            <div className="hm-filterbar" style={{ marginTop: 14 }}>
              <div className="hm-filter-left">
                <div className="hm-filter-title">Total</div>
                <span className="hm-count">${total.toFixed(2)}</span>
              </div>

              <div className="hm-filter-right" style={{ gap: 10 }}>
                <span style={{ opacity: 0.8, fontWeight: 900, fontSize: 13 }}>
                  Subtotal: <strong>${subtotal.toFixed(2)}</strong>
                </span>
                <span style={{ opacity: 0.8, fontWeight: 900, fontSize: 13 }}>
                  Delivery: <strong>${cart.length ? deliveryFee.toFixed(2) : "0.00"}</strong>
                </span>
              </div>
            </div>

            <div style={{ height: 14 }} />

            <IonButton expand="block" className="hm-btn-primary" onClick={placeOrder}>
              Place Order (COD)
            </IonButton>

            <IonButton expand="block" fill="outline" className="hm-btn-outline" onClick={() => history.push("/cart")}>
              Back to cart
            </IonButton>
          </div>

          <div style={{ height: 28 }} />
        </div>

        <IonToast
          isOpen={!!toast}
          message={toast ?? ""}
          duration={1600}
          onDidDismiss={() => setToast(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Checkout;