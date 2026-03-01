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
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

const PROFILE_KEY = "hm_profile";
const PROFILE_EVENT = "hm_profile_updated";

function readProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as any) : {};
  } catch {
    return {};
  }
}

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

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);

      // ✅ merge firebase -> local profile (keep phone)
      const u = auth.currentUser;
      if (u) {
        const cur = readProfile();
        const merged = {
          fullName: cur.fullName || u.displayName || "",
          phone: cur.phone || "",
          email: cur.email || u.email || email.trim(),
        };
        localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new Event(PROFILE_EVENT));
      }

      const backTo = (location.state as any)?.from ?? "/home";
      history.replace(backTo);
    } catch (e: any) {
      setToast(e?.message || "Login failed.");
    }
  };

  return (
    <IonPage>
      <AppHeader showBack backHref="/home" />
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
              <p style={{ marginTop: 0, opacity: 0.75, fontWeight: 850 }}>Sign in to continue.</p>
            </IonText>

            <IonItem lines="none" className="hm-field">
              <IonLabel position="stacked">Email</IonLabel>
              <IonInput
                value={email}
                type="email"
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