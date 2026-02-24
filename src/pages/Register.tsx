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
  IonToast,
  IonText,
} from "@ionic/react";
import { useHistory } from "react-router-dom";

const Register: React.FC = () => {
  const history = useHistory();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const onRegister = async () => {
    // TODO (later): Firebase createUserWithEmailAndPassword + save profile
    if (!name || !phone || !email || !password) {
      setToast("Please fill all fields.");
      return;
    }
    localStorage.setItem("hm_logged_in", "1");
    history.replace("/profile");
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Create account</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="hm-content ion-padding">
        <div className="hm-auth-card">
          <IonText>
            <h2 style={{ marginTop: 0 }}>Create your account</h2>
          </IonText>

          <IonItem lines="inset">
            <IonLabel position="stacked">Name</IonLabel>
            <IonInput value={name} placeholder="Your name" onIonInput={(e) => setName(e.detail.value ?? "")} />
          </IonItem>

          <IonItem lines="inset">
            <IonLabel position="stacked">Phone</IonLabel>
            <IonInput value={phone} placeholder="+961..." onIonInput={(e) => setPhone(e.detail.value ?? "")} />
          </IonItem>

          <IonItem lines="inset">
            <IonLabel position="stacked">Email</IonLabel>
            <IonInput value={email} type="email" placeholder="you@email.com" onIonInput={(e) => setEmail(e.detail.value ?? "")} />
          </IonItem>

          <IonItem lines="inset">
            <IonLabel position="stacked">Password</IonLabel>
            <IonInput value={password} type="password" placeholder="••••••••" onIonInput={(e) => setPassword(e.detail.value ?? "")} />
          </IonItem>

          <div style={{ height: 14 }} />

          <IonButton expand="block" onClick={onRegister}>
            Create account
          </IonButton>

          <IonButton expand="block" fill="outline" onClick={() => history.push("/login")}>
            Back to login
          </IonButton>
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

export default Register;