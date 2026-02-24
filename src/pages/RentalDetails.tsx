import React, { useMemo, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonText,
  IonButton,
  IonModal,
} from "@ionic/react";
import { useHistory, useParams } from "react-router-dom";

type Rental = {
  id: string;
  title: string;
  region: string;
  pricePerNight: number;
  image: string;
  description: string;
  bookedDates: string[]; // YYYY-MM-DD
};

const RentalDetails: React.FC = () => {
  const { rentalId } = useParams<{ rentalId: string }>();
  const history = useHistory();
  const isLoggedIn = localStorage.getItem("hm_logged_in") === "1";

  const [loginModal, setLoginModal] = useState(false);

  const rental: Rental | undefined = useMemo(() => {
    const r: Rental[] = [
      {
        id: "r1",
        title: "Mountain Cabin - Sunset View",
        region: "Faraya",
        pricePerNight: 60,
        image:
          "https://images.unsplash.com/photo-1505691723518-36a5ac3b2d35?auto=format&fit=crop&w=1400&q=60",
        description: "Cozy cabin with fireplace. Great for weekend trips and hunting mornings.",
        bookedDates: ["2026-02-28", "2026-03-01"],
      },
      {
        id: "r2",
        title: "Private Hunting Land (Day Access)",
        region: "Bekaa",
        pricePerNight: 25,
        image:
          "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=60",
        description: "Private land access. Respect property rules and leave no trace.",
        bookedDates: ["2026-02-23"],
      },
    ];
    return r.find((x) => x.id === rentalId);
  }, [rentalId]);

  const requestBooking = () => {
    if (!isLoggedIn) {
      setLoginModal(true);
      return;
    }
    // TODO later: submit booking request to Firestore
    alert("Booking request submitted (mock).");
  };

  if (!rental) {
    return (
      <IonPage>
        <IonHeader translucent>
          <IonToolbar>
            <IonTitle>Rental</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen className="hm-content ion-padding">
          Rental not found.
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>{rental.title}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="hm-content">
        <div
          style={{
            height: 260,
            backgroundImage: `url(${rental.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="hm-section">
          <div className="hm-auth-card" style={{ maxWidth: 860 }}>
            <IonText>
              <h2 style={{ marginTop: 0 }}>{rental.title}</h2>
            </IonText>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ opacity: 0.8 }}>{rental.region}</div>
              <div style={{ fontWeight: 900, color: "var(--hm-accent-2)", fontSize: 20 }}>
                ${rental.pricePerNight} / night
              </div>
            </div>

            <p style={{ opacity: 0.85, marginTop: 10 }}>{rental.description}</p>

            <IonText style={{ display: "block", marginTop: 8, opacity: 0.85 }}>
              <strong>Calendar (view only):</strong>
            </IonText>
            <ul style={{ marginTop: 8, opacity: 0.85 }}>
              {rental.bookedDates.map((d) => (
                <li key={d}>Booked: {d}</li>
              ))}
              {!rental.bookedDates.length && <li>No bookings yet</li>}
            </ul>

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <IonButton expand="block" onClick={requestBooking} style={{ flex: 1, minWidth: 220 }}>
                Request booking
              </IonButton>
              <IonButton expand="block" fill="outline" onClick={() => history.push("/rentals")} style={{ flex: 1, minWidth: 220 }}>
                Back to rentals
              </IonButton>
            </div>

            <IonText style={{ display: "block", marginTop: 10, opacity: 0.75, fontSize: 13 }}>
              Booking submission requires login. Payment is handled offline (Cash).
            </IonText>
          </div>
        </div>

        <IonModal isOpen={loginModal} onDidDismiss={() => setLoginModal(false)}>
          <IonContent className="hm-content ion-padding">
            <div className="hm-auth-card">
              <IonText>
                <h2 style={{ marginTop: 0 }}>Log in required</h2>
              </IonText>
              <p style={{ opacity: 0.85 }}>Please log in to request a booking.</p>
              <IonButton expand="block" onClick={() => history.push("/login", { from: `/rental/${rentalId}` } as any)}>
                Log in
              </IonButton>
              <IonButton expand="block" fill="outline" onClick={() => history.push("/register")}>
                Create account
              </IonButton>
              <IonButton expand="block" fill="clear" onClick={() => setLoginModal(false)}>
                Cancel
              </IonButton>
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default RentalDetails;