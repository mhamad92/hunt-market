import React, { useState } from "react";
import {
  IonPage,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText,
  IonToast,
} from "@ionic/react";
import { useHistory, useLocation } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { isValidEmail, loginLocalUser } from "../utils/authLocal";

const Login: React.FC = () => {
  const history = useHistory();
  const location = useLocation<{ from?: string }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const onLogin = async () => {
    if (!email || !password) {
      setToast("Please enter email and password.");
      return;
    }
    if (!isValidEmail(email)) {
      setToast("Please enter a valid email.");
      return;
    }

    try {
      loginLocalUser(email, password);

      const backTo = (location.state as any)?.from ?? "/profile";
      history.replace(backTo);
    } catch (e: any) {
      setToast(e?.message || "Login failed.");
    }
  };

  return (
    <IonPage>
      <AppHeader />

      <IonContent fullscreen className="hm-content hm-camo">
        <div className="hm-hero hm-camo" style={{ paddingBottom: 18 }}>
          <div className="hm-wrap hm-hero-inner">
            <div className="hm-hero-kicker">
              <span className="hm-dot" /> ACCESS
            </div>
            <h1 className="hm-hero-title">
              LOG IN. <span>GEAR UP.</span>
            </h1>
            <p className="hm-hero-sub">Checkout and booking requests require login.</p>
          </div>
        </div>

        <div className="hm-wrap">
          <div className="hm-auth-card">
            <IonText>
              <h2 style={{ marginTop: 0, marginBottom: 6, fontWeight: 1100 }}>Welcome back</h2>
              <p style={{ marginTop: 0, opacity: 0.75, fontWeight: 850 }}>
                Sign in to continue.
              </p>
            </IonText>

            <IonItem lines="none" className="hm-field">
              <IonLabel position="stacked">Email</IonLabel>
              <IonInput
                value={email}
                type="email"
                inputMode="email"
                placeholder="you@email.com"
                onIonInput={(e) => setEmail(e.detail.value ?? "")}
              />
            </IonItem>

            <IonItem lines="none" className="hm-field">
              <IonLabel position="stacked">Password</IonLabel>
              <IonInput
                value={password}
                type="password"
                placeholder="••••••••"
                onIonInput={(e) => setPassword(e.detail.value ?? "")}
              />
            </IonItem>

            <div style={{ height: 14 }} />

            <IonButton expand="block" className="hm-btn-primary" onClick={onLogin}>
              Log in
            </IonButton>

            <IonButton
              expand="block"
              fill="outline"
              className="hm-btn-outline"
              onClick={() =>
                history.push("/register", { from: (location.state as any)?.from ?? "/profile" } as any)
              }
            >
              Create account
            </IonButton>

            <button
              className="hm-toggle"
              type="button"
              style={{ width: "100%", marginTop: 10 }}
              onClick={() => history.push("/home")}
            >
              Continue browsing
            </button>
          </div>

          <div style={{ height: 28 }} />
        </div>

        <IonToast isOpen={!!toast} message={toast ?? ""} duration={1600} onDidDismiss={() => setToast(null)} />
      </IonContent>
    </IonPage>
  );
};

export default Login;