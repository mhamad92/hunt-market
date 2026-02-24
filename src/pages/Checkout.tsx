import React, { useMemo, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonText,
  IonToast,
} from "@ionic/react";
import { useHistory } from "react-router-dom";

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  storeId: string;
  storeName: string;
};

const Checkout: React.FC = () => {
  const history = useHistory();
  const isLoggedIn = localStorage.getItem("hm_logged_in") === "1";

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const cart: CartItem[] = useMemo(() => {
    const raw = localStorage.getItem("hm_cart");
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  }, []);

  const deliveryFee = 5; // fixed for now (you’ll set later)
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal + (cart.length ? deliveryFee : 0);

  React.useEffect(() => {
    if (!isLoggedIn) history.replace("/login", { from: "/checkout" } as any);
  }, [isLoggedIn, history]);

  const placeOrder = async () => {
    if (!cart.length) {
      setToast("Cart is empty.");
      return;
    }
    if (!phone || !address) {
      setToast("Phone and address are required.");
      return;
    }

    // Order split by store (internal), COD only
    // TODO later: Save order in Firestore, notify stores + delivery partner
    localStorage.removeItem("hm_cart");
    setToast("Order placed (COD). Stores will confirm soon.");

    setTimeout(() => history.replace("/home"), 900);
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Checkout (COD)</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="hm-content ion-padding">
        <div className="hm-auth-card">
          <IonText>
            <h2 style={{ marginTop: 0 }}>Delivery details</h2>
          </IonText>

          <IonItem lines="inset">
            <IonLabel position="stacked">Phone</IonLabel>
            <IonInput value={phone} placeholder="+961..." onIonInput={(e) => setPhone(e.detail.value ?? "")} />
          </IonItem>

          <IonItem lines="inset">
            <IonLabel position="stacked">Address</IonLabel>
            <IonTextarea value={address} placeholder="City, street, building..." onIonInput={(e) => setAddress(e.detail.value ?? "")} />
          </IonItem>

          <IonItem lines="inset">
            <IonLabel position="stacked">Notes (optional)</IonLabel>
            <IonTextarea value={notes} placeholder="Floor, landmark, call before..." onIonInput={(e) => setNotes(e.detail.value ?? "")} />
          </IonItem>

          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", opacity: 0.9 }}>
              <span>Subtotal</span>
              <strong>${subtotal.toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", opacity: 0.9 }}>
              <span>Delivery fee</span>
              <strong>${cart.length ? deliveryFee.toFixed(2) : "0.00"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontWeight: 800 }}>Total</span>
              <span style={{ fontWeight: 900, color: "var(--hm-accent-2)" }}>${total.toFixed(2)}</span>
            </div>
            <IonText style={{ display: "block", marginTop: 8, opacity: 0.75, fontSize: 13 }}>
              Payment method: <strong>Cash on Delivery</strong>
            </IonText>
          </div>

          <div style={{ height: 14 }} />

          <IonButton expand="block" onClick={placeOrder}>
            Place Order (COD)
          </IonButton>

          <IonButton expand="block" fill="outline" onClick={() => history.push("/cart")}>
            Back to cart
          </IonButton>
        </div>

        <IonToast isOpen={!!toast} message={toast ?? ""} duration={1600} onDidDismiss={() => setToast(null)} />
      </IonContent>
    </IonPage>
  );
};

export default Checkout;