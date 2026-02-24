import React, { useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonButton,
  IonText,
  IonToast,
} from "@ionic/react";
import { useHistory, useLocation } from "react-router-dom";

const Login: React.FC = () => {
  const history = useHistory();
  const location = useLocation<{ from?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const onLogin = async () => {
    // TODO (later): Firebase auth signInWithEmailAndPassword
    if (!email || !password) {
      setToast("Please enter email and password.");
      return;
    }
    // Fake login success for now
    localStorage.setItem("hm_logged_in", "1");
    const backTo = location.state?.from ?? "/profile";
    history.replace(backTo);
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Log in</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="hm-content ion-padding">
        <div className="hm-auth-card">
          <IonText>
            <h2 style={{ marginTop: 0 }}>Welcome back</h2>
          </IonText>

          <IonItem lines="inset">
            <IonLabel position="stacked">Email</IonLabel>
            <IonInput
              value={email}
              type="email"
              placeholder="you@email.com"
              onIonInput={(e) => setEmail(e.detail.value ?? "")}
            />
          </IonItem>

          <IonItem lines="inset">
            <IonLabel position="stacked">Password</IonLabel>
            <IonInput
              value={password}
              type="password"
              placeholder="••••••••"
              onIonInput={(e) => setPassword(e.detail.value ?? "")}
            />
          </IonItem>

          <div style={{ height: 14 }} />

          <IonButton expand="block" onClick={onLogin}>
            Log in
          </IonButton>

          <IonButton expand="block" fill="outline" onClick={() => history.push("/register")}>
            Create account
          </IonButton>

          <IonText style={{ display: "block", marginTop: 10, opacity: 0.75, fontSize: 13 }}>
            Checkout and booking requests require login.
          </IonText>
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

export default Login;