// src/components/AppHeader.tsx
import React from "react";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonButton,
  IonIcon,
  IonBadge,
  useIonViewWillEnter,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { cartOutline } from "ionicons/icons";
import useCartCount from "../hooks/useCartCount";

type AppHeaderProps = {
  /** show back button on the left */
  showBack?: boolean;
  /** default back route for IonBackButton */
  backHref?: string;

  /** show cart icon on the right */
  showCart?: boolean;
  /** route to open when cart icon is clicked */
  cartHref?: string;

  /** click on the app title goes home */
  homeHref?: string;

  /** use your branded title (default true). If false, uses simpleTitle */
  useBrandTitle?: boolean;
  /** optional simple title text */
  simpleTitle?: string;

  /** optional toolbar className */
  toolbarClassName?: string;

  /** optional right slot override (replaces cart button) */
  rightSlot?: React.ReactNode;
};

const BrandTitle: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <IonTitle className="hm-app-title" onClick={onClick}>
    <span className="hm-brand">
      <span className="hm-antler" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <path d="M32 18c-3 0-6 3-6 7 0 2 .5 3.7 1.4 5.2-2.6-.4-4.8-1.8-6.7-3.9-2-2.2-3.1-5.2-3.1-8.3 0-1-.8-1.8-1.8-1.8S14 17 14 18c0 4 1.4 7.9 4 10.8 2.5 2.9 5.9 4.8 9.6 5.4.6.1 1.1.2 1.7.2.8 1 1.8 1.8 3 2.3V46c0 1 .8 1.8 1.8 1.8S36 47 36 46V36.9c1.2-.5 2.2-1.3 3-2.3.6 0 1.1-.1 1.7-.2 3.7-.6 7.1-2.5 9.6-5.4 2.6-2.9 4-6.8 4-10.8 0-1-.8-1.8-1.8-1.8S50 17 50 18c0 3.1-1.1 6.1-3.1 8.3-1.9 2.1-4.1 3.5-6.7 3.9.9-1.5 1.4-3.2 1.4-5.2 0-4-3-7-6-7Z" />
          <path d="M18 25c-2.2 0-4.2 1.2-5.4 3.1-.5.9-.2 2 .7 2.5.9.5 2 .2 2.5-.7.6-1 1.4-1.3 2.2-1.3 1 0 2 .7 2.6 1.9.4.9 1.5 1.3 2.4.9.9-.4 1.3-1.5.9-2.4C24.8 27 21.5 25 18 25Z" />
          <path d="M46 25c-3.5 0-6.8 2-7.9 5.1-.4.9 0 2 .9 2.4.9.4 2 0 2.4-.9.6-1.2 1.6-1.9 2.6-1.9.8 0 1.6.3 2.2 1.3.5.9 1.6 1.2 2.5.7.9-.5 1.2-1.6.7-2.5C50.2 26.2 48.2 25 46 25Z" />
        </svg>
      </span>

      <span className="hm-brand-text">
        <span>HUNT</span>
      </span>

      <span className="hm-brand-text2">
        <span>MARKET</span>
      </span>
    </span>
  </IonTitle>
);

const AppHeader: React.FC<AppHeaderProps> = ({
  showBack = false,
  backHref = "/home",
  showCart = true,
  cartHref = "/cart",
  homeHref = "/home",
  useBrandTitle = true,
  simpleTitle,
  toolbarClassName = "hm-toolbar",
  rightSlot,
}) => {
  const history = useHistory();
  const { count: cartCount, refresh } = useCartCount();

  // IMPORTANT: refresh when view becomes active (Ionic keeps pages mounted)
  useIonViewWillEnter(() => refresh());

  return (
    <IonHeader translucent>
      <IonToolbar className={toolbarClassName}>
        <IonButtons slot="start">
          {showBack ? <IonBackButton defaultHref={backHref} /> : null}
        </IonButtons>

        {useBrandTitle ? (
          <BrandTitle onClick={() => history.push(homeHref)} />
        ) : (
          <IonTitle
            style={{ textAlign: "center", cursor: "pointer", fontWeight: 800 }}
            onClick={() => history.push(homeHref)}
          >
            {simpleTitle ?? "HUNT MARKET"}
          </IonTitle>
        )}

        <IonButtons slot="end">
          {rightSlot ? (
            rightSlot
          ) : showCart ? (
            <IonButton onClick={() => history.push(cartHref)} className="hm-cart-btn">
              <IonIcon icon={cartOutline} />
              {cartCount > 0 && <IonBadge className="hm-cart-badge">{cartCount}</IonBadge>}
            </IonButton>
          ) : null}
        </IonButtons>
      </IonToolbar>
    </IonHeader>
  );
};

export default AppHeader;