import React from "react";
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from "@ionic/react";
import { useHistory } from "react-router-dom";

const Profile: React.FC = () => {
  const history = useHistory();

  // For now, assume logged out (we add auth in later steps)
  const isLoggedIn = false;

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Profile</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="hm-content ion-padding">
        {!isLoggedIn ? (
          <div className="hm-auth-card">
            <h2 style={{ margin: 0 }}>Welcome</h2>
            <p style={{ opacity: 0.85, marginTop: 8 }}>
              Log in to checkout orders and request bookings.
            </p>

            <IonButton expand="block" onClick={() => history.push("/login")}>
              Log in
            </IonButton>
            <IonButton expand="block" fill="outline" onClick={() => history.push("/register")}>
              Create account
            </IonButton>
          </div>
        ) : (
          <div>Logged in view will be here</div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Profile;