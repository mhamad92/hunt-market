import React, { useMemo } from "react";
import { IonPage, IonContent, IonSpinner } from "@ionic/react";
import { Redirect, Route, useHistory, useLocation } from "react-router-dom";
import { useIsAdmin } from "../lib/admin";

// pages
import AdminProducts from "./AdminProducts";
import AdminStores from "./AdminStores";
import AdminCategories from "./AdminCategories";

// keep raffles separate (you already have)
import AdminDashboard from "./AdminDashboard";
import AdminRaffle from "./AdminRaffle";

const NavItem: React.FC<{
  label: string;
  path: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      width: "100%",
      textAlign: "left",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.10)",
      background: active ? "rgba(255,255,255,0.12)" : "transparent",
      color: "#fff",
      fontWeight: 900,
      cursor: "pointer",
    }}
  >
    {label}
  </button>
);

const AdminLayout: React.FC = () => {
  const { loading, isAdmin } = useIsAdmin();
  const history = useHistory();
  const location = useLocation();

  const nav = useMemo(
    () => [
      { label: "Dashboard (Raffles)", path: "/admin" },
      { label: "Products", path: "/admin/products" },
      { label: "Stores", path: "/admin/stores" },
      { label: "Categories", path: "/admin/categories" },
    ],
    []
  );

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <div style={{ padding: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <IonSpinner name="dots" />
            Checking admin access…
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!isAdmin) {
    return (
      <IonPage>
        <IonContent>
          <div style={{ padding: 20 }}>
            <div
              style={{
                maxWidth: 720,
                margin: "40px auto",
                padding: 16,
                borderRadius: 16,
                background: "#111",
                border: "1px solid #333",
                color: "#fff",
              }}
            >
              <div style={{ fontWeight: 1100, fontSize: 18 }}>Not authorized</div>
              <div style={{ opacity: 0.8, marginTop: 8 }}>This section is admin-only.</div>
              <button
                onClick={() => history.replace("/home")}
                type="button"
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #333",
                  background: "#1a1a1a",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Go home
              </button>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent>
        {/* Layout wrapper */}
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
          {/* Sidebar */}
          <aside
            style={{
              background: "linear-gradient(180deg,#0b0b0b,#111)",
              borderRight: "1px solid rgba(255,255,255,0.08)",
              padding: 14,
              color: "#fff",
            }}
          >
            <div style={{ padding: 10 }}>
              <div style={{ fontWeight: 1100, fontSize: 16 }}>Marketplace Admin</div>
              <div style={{ opacity: 0.7, marginTop: 4, fontSize: 12 }}>Manage stores, products, categories.</div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {nav.map((n) => (
                <NavItem
                  key={n.path}
                  label={n.label}
                  path={n.path}
                  active={location.pathname === n.path}
                  onClick={() => history.push(n.path)}
                />
              ))}
            </div>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <button
                type="button"
                onClick={() => history.push("/home")}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "transparent",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Back to app
              </button>
            </div>
          </aside>

          {/* Main */}
          <main style={{ background: "#f6f7fb" }}>
            {/* Topbar */}
            <div
              style={{
                height: 58,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                borderBottom: "1px solid rgba(0,0,0,0.08)",
                background: "#fff",
              }}
            >
              <div style={{ fontWeight: 1000 }}>
                {location.pathname === "/admin"
                  ? "Dashboard"
                  : location.pathname.includes("/admin/products")
                  ? "Products"
                  : location.pathname.includes("/admin/stores")
                  ? "Stores"
                  : location.pathname.includes("/admin/categories")
                  ? "Categories"
                  : "Admin"}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => history.push("/raffles")}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "#fff",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  View Raffles (Public)
                </button>
              </div>
            </div>

            {/* Page outlet */}
            <div style={{ padding: 16 }}>
              <Route exact path="/admin" component={AdminDashboard} />
              <Route exact path="/admin/raffles/:raffleId" component={AdminRaffle} />

              <Route exact path="/admin/products" component={AdminProducts} />
              <Route exact path="/admin/stores" component={AdminStores} />
              <Route exact path="/admin/categories" component={AdminCategories} />

              <Route exact path="/admin/*">
                <Redirect to="/admin" />
              </Route>
            </div>
          </main>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminLayout;