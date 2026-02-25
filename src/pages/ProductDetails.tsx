import React, { useMemo, useState, useEffect } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonIcon,
  IonButton,
  IonBadge,
  IonToast,
  IonAlert,
  IonModal
} from "@ionic/react";
import { useParams, useHistory } from "react-router-dom";
import { cartOutline, storefrontOutline, shieldCheckmarkOutline } from "ionicons/icons";
import useCartCount from "../hooks/useCartCount";
import AppHeader from "../components/AppHeader";
import { Swiper, SwiperSlide } from "swiper/react";
import { Zoom } from "swiper/modules";
import "swiper/css";
import "swiper/css/zoom";
import { PRODUCTS } from "../data/products";

type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
  categoryId: string;
  storeId: string;
  storeName: string;
  description: string;
  inStock?: boolean;
  sizes?: string[];
};

type RouteParams = { productId: string };

const ProductDetails: React.FC = () => {
  const { productId } = useParams<RouteParams>();
  const history = useHistory();


  // 18+ session gate (same logic as Home)
  const is18Ok = () => sessionStorage.getItem("hm_18_ok") === "1";
  const isRestricted = (cat: string) => cat === "shotguns" || cat === "ammo";

  const [show18Alert, setShow18Alert] = useState(false);
  const [is18Verified, setIs18Verified] = useState(is18Ok());
  const { count: cartCount } = useCartCount();
  const [showImageModal, setShowImageModal] = useState(false);

  // Gallery state
  const [activeImg, setActiveImg] = useState(0);

  // UI state
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState<string>("");
  const [toast, setToast] = useState<string>("");

  const product = useMemo(
  () => PRODUCTS.find((p) => p.id === productId),
  [productId]
);

  // Reset UI state when product changes
  useEffect(() => {
    setQty(1);
    setSize("");
    setActiveImg(0);
    setIs18Verified(is18Ok());
  }, [productId]);

  if (!product) {
    return (
      <IonPage>
        {/* 👇 REUSABLE GLOBAL HEADER */}
    <AppHeader showBack backHref="/home" />

        <IonContent className="hm-content hm-camo">
          <div className="hm-wrap" style={{ paddingTop: 18 }}>
            <div style={{ color: "rgba(238,243,238,0.8)", fontWeight: 900 }}>
              Product not found.
            </div>
            <IonButton style={{ marginTop: 14 }} onClick={() => history.push("/home")}>
              Back to Home
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const needsGate = isRestricted(product.categoryId) && !is18Verified;

  const handlePrimaryAction = () => {
    if (needsGate) {
      setShow18Alert(true);
      return;
    }

    if (product.categoryId === "shotguns") {
      setToast("Purchase is handled in-store. Contact the store from this page.");
      return;
    }

    if (product.categoryId === "ammo") {
      setToast("Reserved. The store will confirm availability shortly.");
      return;
    }

    if (product.sizes?.length && !size) {
      setToast("Select a size first.");
      return;
    }

   try {
  const raw = localStorage.getItem("hm_cart");
  const cart = raw ? JSON.parse(raw) : [];

  const key = `${product.id}::${size || ""}`;
  const idx = cart.findIndex((x: any) => `${x.productId}::${x.size || ""}` === key);

  if (idx >= 0) {
    cart[idx].qty = Math.min(99, (cart[idx].qty || 1) + qty);
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      qty,
      size: size || null,
      image: product.images?.[0] || null,
      storeId: product.storeId,
      storeName: product.storeName,
      type: product.categoryId === "ammo" ? "reserve" : "normal",
    });
  }

  localStorage.setItem("hm_cart", JSON.stringify(cart));
  window.dispatchEvent(new Event("hm_cart_updated"));
  setToast("Added to cart.");
} catch (err) {
  console.error("Cart error:", err);
  setToast("Could not add to cart.");
}
}  

  const primaryLabel =
    product.categoryId === "shotguns"
      ? "Purchase from store"
      : product.categoryId === "ammo"
      ? "Reserve in store"
      : "Add to cart";

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar className="hm-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>

          {/* Center app title (same as Home) */}
          <IonTitle className="hm-app-title" onClick={() => history.push("/home")}>
            <span className="hm-brand">
              <span className="hm-antler" aria-hidden="true">
                <svg viewBox="0 0 64 64">
                  <path d="M32 18c-3 0-6 3-6 7 0 2 .5 3.7 1.4 5.2-2.6-.4-4.8-1.8-6.7-3.9-2-2.2-3.1-5.2-3.1-8.3 0-1-.8-1.8-1.8-1.8S14 17 14 18c0 4 1.4 7.9 4 10.8 2.5 2.9 5.9 4.8 9.6 5.4.6.1 1.1.2 1.7.2.8 1 1.8 1.8 3 2.3V46c0 1 .8 1.8 1.8 1.8S36 47 36 46V36.9c1.2-.5 2.2-1.3 3-2.3.6 0 1.1-.1 1.7-.2 3.7-.6 7.1-.6 9.6-5.4 2.6-2.9 4-6.8 4-10.8 0-1-.8-1.8-1.8-1.8S50 17 50 18c0 3.1-1.1 6.1-3.1 8.3-1.9 2.1-4.1 3.5-6.7 3.9.9-1.5 1.4-3.2 1.4-5.2 0-4-3-7-6-7Z" />
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

          <IonButtons slot="end">
            <IonButton onClick={() => history.push("/cart")} className="hm-cart-btn">
  <IonIcon icon={cartOutline} />
  {cartCount > 0 && <IonBadge className="hm-cart-badge">{cartCount}</IonBadge>}
</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="hm-content hm-camo">
        <div className="hm-wrap" style={{ paddingTop: 14, paddingBottom: 22 }}>
          {/* Gallery */}
          <div className="pd-gallery">
           <div className="pd-heroimg" style={{ backgroundImage: `url(${product.images[activeImg]})` }} onClick={() => setShowImageModal(true)} role="button"
/>
            {product.images.length > 1 && (
              <div className="pd-thumbs">
                {product.images.map((img, i) => (
                  <button
                    key={img}
                    className={`pd-thumb ${i === activeImg ? "active" : ""}`}
                    style={{ backgroundImage: `url(${img})` }}
                    onClick={() => setActiveImg(i)}
                    type="button"
                    aria-label={`Image ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Main card */}
          <div className="pd-card">
            <div className="pd-top">
              <div>
                <div className="pd-title">{product.name}</div>
                <div className="pd-sub">
                  <IonIcon icon={storefrontOutline} />
                  <button
                    className="pd-storelink"
                    onClick={() => history.push(`/stores/${product.storeId}`)}
                    type="button"
                  >
                    {product.storeName}
                  </button>
                </div>
              </div>

              <div className="pd-price">
                ${product.price}
                {product.categoryId === "ammo" && <div className="pd-note">Reserve • pay in store</div>}
                {product.categoryId === "shotguns" && <div className="pd-note">In-store purchase</div>}
              </div>
            </div>

            <div className="pd-badges">
              <IonBadge className="pd-badge">{product.inStock ? "In stock" : "Out of stock"}</IonBadge>

              {(product.categoryId === "ammo" || product.categoryId === "shotguns") && (
                <IonBadge className="pd-badge warn">
                  <IonIcon icon={shieldCheckmarkOutline} style={{ marginRight: 6 }} />
                  18+
                </IonBadge>
              )}
            </div>

            <div className="pd-desc">{product.description}</div>

            {product.sizes?.length ? (
              <div className="pd-row">
                <div className="pd-label">Size</div>
                <div className="pd-sizes">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      className={`pd-size ${size === s ? "active" : ""}`}
                      onClick={() => setSize(s)}
                      type="button"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {product.categoryId !== "shotguns" && (
              <div className="pd-row">
                <div className="pd-label">Qty</div>
                <div className="pd-qty">
                  <button className="pd-qtybtn" onClick={() => setQty((v) => Math.max(1, v - 1))} type="button">
                    −
                  </button>
                  <div className="pd-qtynum">{qty}</div>
                  <button className="pd-qtybtn" onClick={() => setQty((v) => Math.min(99, v + 1))} type="button">
                    +
                  </button>
                </div>
              </div>
            )}

            <div className="pd-actions">
              <button className="pd-primary" onClick={handlePrimaryAction} type="button">
                {primaryLabel}
              </button>

              <button className="pd-secondary" onClick={() => history.push(`/store/${product.storeId}`)} type="button">
                View store
              </button>
            </div>

            {(product.categoryId === "shotguns" || product.categoryId === "ammo") && (
              <div className="pd-footnote">
                Restricted category — age verification required. Purchase is handled by the store.
              </div>
            )}
          </div>
        </div>

        <IonAlert
          isOpen={show18Alert}
          header="Adults only (18+)"
          subHeader="Restricted category"
          message="You must be 18+ to view Shotguns or Ammunition details."
          buttons={[
            { text: "Cancel", role: "cancel", handler: () => setShow18Alert(false) },
            {
              text: "I’m 18+",
              handler: () => {
                sessionStorage.setItem("hm_18_ok", "1");
                setIs18Verified(true);
                setShow18Alert(false);
                setToast("Verified. You can view restricted items this session.");
              },
            },
          ]}
        />

       <IonModal
  isOpen={showImageModal}
  onDidDismiss={() => setShowImageModal(false)}
  backdropDismiss={true}
  className="hm-image-modal"
>
  <div className="hm-image-modal-content">

    <Swiper
      modules={[Zoom]}
      zoom={true}
      initialSlide={activeImg}
      spaceBetween={10}
      slidesPerView={1}
      className="hm-swiper"
    >
      {product.images.map((img, index) => (
        <SwiperSlide key={index}>
          <div className="swiper-zoom-container">
            <img src={img} alt={product.name} />
          </div>
        </SwiperSlide>
      ))}
    </Swiper>

    <button
      className="hm-image-close"
      onClick={() => setShowImageModal(false)}
    >
      ✕
    </button>

  </div>
</IonModal>

        <IonToast isOpen={!!toast} message={toast} duration={1500} onDidDismiss={() => setToast("")} />
      </IonContent>
    </IonPage>
  );
};

export default ProductDetails;