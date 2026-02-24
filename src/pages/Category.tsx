import React, { useMemo, useState } from "react";
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
  IonModal,
  IonButton,
  IonText,
} from "@ionic/react";
import { useHistory, useParams } from "react-router-dom";

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  categoryId: string;
};

const Category: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const history = useHistory();

  const [ageModal, setAgeModal] = useState(() => {
    const isRestricted = categoryId === "ammo" || categoryId === "shotguns";
    if (!isRestricted) return false;
    const allowed = localStorage.getItem(`hm_age_ok_${categoryId}`) === "1";
    return !allowed;
  });

  const categoryName = useMemo(() => {
    const map: Record<string, string> = {
      clothing: "Clothing",
      shoes: "Shoes",
      optics: "Optics",
      camping: "Camping",
      calls: "Calls",
      ammo: "Ammunition",
      shotguns: "Shotguns",
    };
    return map[categoryId] ?? categoryId;
  }, [categoryId]);

  const products: Product[] = useMemo(
    () => [
      {
        id: "p1",
        name: "Camo Jacket Pro",
        price: 45,
        image:
          "https://images.unsplash.com/photo-1520975958225-1c2e3f1a8d8a?auto=format&fit=crop&w=900&q=60",
        categoryId: "clothing",
      },
      {
        id: "p2",
        name: "Hiking Boots X",
        price: 60,
        image:
          "https://images.unsplash.com/photo-1528701800489-20be3c6a2c1e?auto=format&fit=crop&w=900&q=60",
        categoryId: "shoes",
      },
      {
        id: "p3",
        name: "Binoculars 10x42",
        price: 75,
        image:
          "https://images.unsplash.com/photo-1516571748831-5d81767b788d?auto=format&fit=crop&w=900&q=60",
        categoryId: "optics",
      },
      {
        id: "p6",
        name: "12ga Shells Box",
        price: 20,
        image:
          "https://images.unsplash.com/photo-1604617677229-96d65e6a85ee?auto=format&fit=crop&w=900&q=60",
        categoryId: "ammo",
      },
      {
        id: "p7",
        name: "Over/Under Shotgun",
        price: 900,
        image:
          "https://images.unsplash.com/photo-1609851451256-7f9e3b1a4d74?auto=format&fit=crop&w=900&q=60",
        categoryId: "shotguns",
      },
    ],
    []
  );

  const list = products.filter((p) => p.categoryId === categoryId);

  const allowAge = () => {
    localStorage.setItem(`hm_age_ok_${categoryId}`, "1");
    setAgeModal(false);
  };

  const denyAge = () => {
    setAgeModal(false);
    history.replace("/home");
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>{categoryName}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="hm-content">
        <div className="hm-section">
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

        <IonModal isOpen={ageModal} onDidDismiss={denyAge}>
          <IonContent className="hm-content ion-padding">
            <div className="hm-auth-card">
              <IonText>
                <h2 style={{ marginTop: 0 }}>18+ required</h2>
              </IonText>
              <p style={{ opacity: 0.85 }}>
                This section contains regulated items. Are you above 18?
              </p>
              <IonButton expand="block" onClick={allowAge}>
                Yes, I’m 18+
              </IonButton>
              <IonButton expand="block" fill="outline" onClick={denyAge}>
                No
              </IonButton>
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Category;