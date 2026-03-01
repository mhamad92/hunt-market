import React from "react";
import { IonPage, IonContent } from "@ionic/react";
import { useHistory } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useIsAdmin } from "../lib/admin";

const AdminMarket: React.FC = () => {
  const history = useHistory();
  const { loading, isAdmin } = useIsAdmin();

  if (loading) {
    return (
      <IonPage>
        <AppHeader showBack backHref="/profile" />
        <IonContent className="hm-content hm-camo">
          <div className="hm-wrap" style={{ padding: 20 }}>
            <div className="stores-empty">Checking access…</div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!isAdmin) {
    return (
      <IonPage>
        <AppHeader showBack backHref="/profile" />
        <IonContent className="hm-content hm-camo">
          <div className="hm-wrap" style={{ padding: 20 }}>
            <div className="hm-auth-card">
              <h2>Marketplace Admin</h2>
              <p style={{ opacity: 0.8 }}>You are not authorized to view this page.</p>
              <button className="pd-primary" onClick={() => history.push("/home")} type="button">
                Go Home
              </button>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <AppHeader showBack backHref="/profile" />
      <IonContent className="hm-content hm-camo">
        <div className="hm-wrap" style={{ padding: 20 }}>
          <div className="hm-auth-card" style={{ maxWidth: 980, margin: "0 auto" }}>
            <div style={{ fontWeight: 1100, fontSize: 20 }}>Marketplace Admin</div>
            <div style={{ opacity: 0.75, marginTop: 4 }}>
              Manage stores, products and categories.
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <button className="pd-primary" onClick={() => history.push("/admin/products")} type="button">
                Manage Products
              </button>
              
              <button
  className="pd-primary"
  type="button"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    history.push("/admin/stores");
  }}
>
  Manage Stores
</button>

<button
  className="pd-primary"
  type="button"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    history.push("/admin/categories");
  }}
>
  Manage Categories
</button>


            </div>

            
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminMarket;