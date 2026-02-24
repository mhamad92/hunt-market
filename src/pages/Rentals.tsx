import React, { useMemo } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonText,
  IonButton,
  IonIcon,
} from "@ionic/react";
import { calendarOutline, chevronForwardOutline } from "ionicons/icons";
import { useHistory } from "react-router-dom";

type Rental = {
  id: string;
  title: string;
  region: string;
  pricePerNight: number;
  image: string;
  type: "Land" | "Cabin";
};

const Rentals: React.FC = () => {
  const history = useHistory();

  const rentals: Rental[] = useMemo(
    () => [
      {
        id: "r1",
        title: "Mountain Cabin - Sunset View",
        region: "Faraya",
        pricePerNight: 60,
        type: "Cabin",
        image:
          "https://images.unsplash.com/photo-1505691723518-36a5ac3b2d35?auto=format&fit=crop&w=1200&q=60",
      },
      {
        id: "r2",
        title: "Private Hunting Land (Day Access)",
        region: "Bekaa",
        pricePerNight: 25,
        type: "Land",
        image:
          "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=60",
      },
    ],
    []
  );

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Rentals</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="hm-content">
        <div className="hm-section">
          {rentals.map((r) => (
            <IonCard key={r.id} className="hm-rental-card" button onClick={() => history.push(`/rental/${r.id}`)}>
              <div className="hm-rental-img" style={{ backgroundImage: `url(${r.image})` }} />
              <IonCardContent>
                <div className="hm-badges">
                  <span className="hm-badge">{r.type}</span>
                  <span className="hm-badge hm-badge-muted">{r.region}</span>
                </div>

                <IonText className="hm-rental-title">{r.title}</IonText>
                <div className="hm-rental-price">${r.pricePerNight} / night</div>

                <div className="hm-rental-actions">
                  <IonButton fill="outline" size="small">
                    <IonIcon icon={calendarOutline} slot="start" />
                    View calendar
                  </IonButton>
                  <IonButton fill="clear" size="small">
                    Details <IonIcon icon={chevronForwardOutline} />
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Rentals;