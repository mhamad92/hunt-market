import React, { useMemo } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
  IonText,
  IonButton,
} from "@ionic/react";
import { useHistory, useParams } from "react-router-dom";

type Product = { id: string; name: string; price: number; image: string; storeId: string };
type Store = { id: string; name: string; region: string; phone: string; note: string };

const StoreDetails: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const history = useHistory();

  const store: Store | undefined = useMemo(() => {
    const s: Store[] = [
      { id: "s1", name: "Falcon Hunt Store", region: "Beirut", phone: "+961 70 000 000", note: "Orders prepared by store. Delivery handled by platform." },
      { id: "s2", name: "Beqaa Outdoors", region: "Bekaa", phone: "+961 71 000 000", note: "COD only. In-store purchase for regulated items." },
    ];
    return s.find((x) => x.id === storeId);
  }, [storeId]);

  const products: Product[] = useMemo(
    () => [
      {
        id: "p1",
        name: "Camo Jacket Pro",
        price: 45,
        image:
          "https://images.unsplash.com/photo-1520975958225-1c2e3f1a8d8a?auto=format&fit=crop&w=900&q=60",
        storeId: "s1",
      },
      {
        id: "p3",
        name: "Binoculars 10x42",
        price: 75,
        image:
          "https://images.unsplash.com/photo-1516571748831-5d81767b788d?auto=format&fit=crop&w=900&q=60",
        storeId: "s1",
      },
      {
        id: "p6",
        name: "12ga Shells Box",
        price: 20,
        image:
          "https://images.unsplash.com/photo-1604617677229-96d65e6a85ee?auto=format&fit=crop&w=900&q=60",
        storeId: "s1",
      },
    ],
    []
  );

  const list = products.filter((p) => p.storeId === storeId);

  if (!store) {
    return (
      <IonPage>
        <IonHeader translucent>
          <IonToolbar>
            <IonTitle>Store</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen className="hm-content ion-padding">
          Store not found.
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>{store.name}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="hm-content">
        <div className="hm-section">
          <div className="hm-auth-card" style={{ maxWidth: 960 }}>
            <IonText>
              <h2 style={{ marginTop: 0 }}>{store.name}</h2>
            </IonText>
            <div style={{ opacity: 0.8 }}>{store.region}</div>
            <div style={{ marginTop: 8, fontSize: 14, opacity: 0.85 }}>{store.note}</div>

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <IonButton fill="outline" onClick={() => window.open(`tel:${store.phone}`)}>
                Call Store
              </IonButton>
              <IonButton onClick={() => history.push("/cart")}>Go to Cart</IonButton>
            </div>
          </div>

          <IonText className="hm-title" style={{ display: "block", margin: "14px 0 8px" }}>
            Products
          </IonText>

          <IonGrid fixed>
            <IonRow>
              {list.map((p) => (
                <IonCol size="6" sizeMd="4" sizeLg="3" key={p.id}>
                  <IonCard className="hm-store-card" button onClick={() => history.push(`/product/${p.id}`)}>
                    <div className="hm-card-img" style={{ backgroundImage: `url(${p.image})` }} />
                    <IonCardContent>
                      <div className="hm-card-name">{p.name}</div>
                      <div className="hm-card-price">${p.price}</div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              ))}
            </IonRow>
          </IonGrid>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default StoreDetails;