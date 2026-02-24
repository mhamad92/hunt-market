import React, { useMemo, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonCard,
  IonCardContent,
  IonText,
  IonButton,
  IonButtons,
  IonIcon,
} from "@ionic/react";
import { cartOutline, chevronForwardOutline } from "ionicons/icons";
import { useHistory } from "react-router-dom";

type Store = {
  id: string;
  name: string;
  region: string;
  logo: string;
  previewItems: { id: string; image: string; price: number }[];
};

const Stores: React.FC = () => {
  const history = useHistory();
  const [q, setQ] = useState("");

  const stores: Store[] = useMemo(
    () => [
      {
        id: "s1",
        name: "Falcon Hunt Store",
        region: "Beirut",
        logo:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=60",
        previewItems: [
          {
            id: "p1",
            image:
              "https://images.unsplash.com/photo-1520975958225-1c2e3f1a8d8a?auto=format&fit=crop&w=400&q=60",
            price: 45,
          },
          {
            id: "p3",
            image:
              "https://images.unsplash.com/photo-1516571748831-5d81767b788d?auto=format&fit=crop&w=400&q=60",
            price: 75,
          },
          {
            id: "p6",
            image:
              "https://images.unsplash.com/photo-1604617677229-96d65e6a85ee?auto=format&fit=crop&w=400&q=60",
            price: 20,
          },
        ],
      },
      {
        id: "s2",
        name: "Mountain Gear",
        region: "Keserwan",
        logo:
          "https://images.unsplash.com/photo-1520975680401-7a3b2a3c2ef2?auto=format&fit=crop&w=200&q=60",
        previewItems: [
          {
            id: "p2",
            image:
              "https://images.unsplash.com/photo-1528701800489-20be3c6a2c1e?auto=format&fit=crop&w=400&q=60",
            price: 60,
          },
          {
            id: "p4",
            image:
              "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=400&q=60",
            price: 18,
          },
        ],
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return stores;
    return stores.filter((s) => (s.name + " " + s.region).toLowerCase().includes(term));
  }, [q, stores]);

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Stores</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push("/cart")}>
              <IonIcon icon={cartOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

        {/* Sticky search (Stores requirement) */}
        <IonToolbar>
          <IonSearchbar
            value={q}
            placeholder="Search stores or items..."
            onIonInput={(e) => setQ(e.detail.value ?? "")}
          />
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="hm-content">
        <div className="hm-section">
          {filtered.map((s) => (
            <IonCard key={s.id} className="hm-store-card">
              <IonCardContent>
                <div className="hm-store-top">
                  <div className="hm-store-logo" style={{ backgroundImage: `url(${s.logo})` }} />
                  <div className="hm-store-meta">
                    <IonText className="hm-store-name">{s.name}</IonText>
                    <div className="hm-store-sub">{s.region}</div>
                  </div>
                  <IonButton
                    fill="clear"
                    size="small"
                    onClick={() => history.push(`/store/${s.id}`)}
                  >
                    View <IonIcon icon={chevronForwardOutline} />
                  </IonButton>
                </div>

                <div className="hm-row hm-row-scroll" style={{ marginTop: 12 }}>
                  {s.previewItems.map((it) => (
                    <div
                      key={it.id}
                      className="hm-mini"
                      onClick={() => history.push(`/product/${it.id}`)}
                      role="button"
                    >
                      <div className="hm-mini-img" style={{ backgroundImage: `url(${it.image})` }} />
                      <div className="hm-mini-price">${it.price}</div>
                    </div>
                  ))}
                </div>
              </IonCardContent>
            </IonCard>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Stores;