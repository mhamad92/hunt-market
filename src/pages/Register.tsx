import React, { useState } from "react";
import {
  IonPage,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonToast,
  IonText,
} from "@ionic/react";
import { useHistory, useLocation } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase";

const PROFILE_KEY = "hm_profile";

const digitsOnly = (v: string) => (v ?? "").replace(/\D/g, "");
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const Register: React.FC = () => {
  const history = useHistory();
  const location = useLocation<{ from?: string }>();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState(""); // digits only
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const onRegister = async () => {
    const fullName = name.trim();
    const phoneDigits = digitsOnly(phone);
    const emailTrim = email.trim();

    if (!fullName || !phoneDigits || !emailTrim || !password) {
      setToast("Please fill all fields.");
      return;
    }
    if (!isValidEmail(emailTrim)) {
      setToast("Please enter a valid email address.");
      return;
    }
    if (phoneDigits.length < 7) {
      setToast("Please enter a valid phone number.");
      return;
    }
    if (password.length < 6) {
      setToast("Password must be at least 6 characters.");
      return;
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, emailTrim, password);

      // set display name in Firebase Auth
      await updateProfile(res.user, { displayName: fullName });

      // keep your existing "fast checkout" local profile
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({ fullName, phone: phoneDigits, email: emailTrim })
      );

      const backTo = (location.state as any)?.from ?? "/profile";
      history.replace(backTo);
    } catch (e: any) {
      setToast(e?.message || "Could not create account.");
    }
  };

  return (
    <IonPage>
       <AppHeader showBack backHref="/home" />

      <IonContent fullscreen className="hm-content hm-camo">
        <div className="hm-hero hm-camo" style={{ paddingBottom: 18 }}>
          <div className="hm-wrap hm-hero-inner">
            <div className="hm-hero-kicker">
              <span className="hm-dot" /> JOIN
            </div>
            <h1 className="hm-hero-title">
              CREATE. <span>HUNT.</span>
            </h1>
            <p className="hm-hero-sub">One account for shopping and booking.</p>
          </div>
        </div>

        <div className="hm-wrap">
          <div className="hm-auth-card">
            <IonText>
              <h2 style={{ marginTop: 0, marginBottom: 6, fontWeight: 1100 }}>Create your account</h2>
              <p style={{ marginTop: 0, opacity: 0.75, fontWeight: 850 }}>
                Your phone will be used for delivery contact.
              </p>
            </IonText>

            <IonItem lines="none" className="hm-field">
              <IonLabel position="stacked">Name</IonLabel>
              <IonInput
                value={name}
                placeholder="Your name"
                onIonInput={(e) => setName(e.detail.value ?? "")}
              />
            </IonItem>

            <IonItem lines="none" className="hm-field">
              <IonLabel position="stacked">Phone (numbers only)</IonLabel>
              <IonInput
                value={phone}
                inputMode="numeric"
                type="tel"
                placeholder="961..."
                onIonInput={(e) => setPhone(digitsOnly(e.detail.value ?? ""))}
              />
            </IonItem>

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

            <IonButton expand="block" className="hm-btn-primary" onClick={onRegister}>
              Create account
            </IonButton>

            <IonButton
              expand="block"
              fill="outline"
              className="hm-btn-outline"
              onClick={() => history.push("/login", { from: (location.state as any)?.from } as any)}
            >
              Back to login
            </IonButton>
          </div>

          <div style={{ height: 28 }} />
        </div>

        <IonToast isOpen={!!toast} message={toast ?? ""} duration={1800} onDidDismiss={() => setToast(null)} />
      </IonContent>
    </IonPage>
  );
};

export default Register;