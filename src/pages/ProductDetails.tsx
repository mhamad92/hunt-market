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
  IonModal,
  IonInput,
  IonTextarea,
  IonLabel,
  IonSelect,
  IonSelectOption
} from "@ionic/react";
import { useParams, useHistory } from "react-router-dom";
import { cartOutline, storefrontOutline, shieldCheckmarkOutline } from "ionicons/icons";
import useCartCount from "../hooks/useCartCount";
import AppHeader from "../components/AppHeader";
import { Swiper, SwiperSlide } from "swiper/react";
import { Zoom } from "swiper/modules";
import "swiper/css";
import "swiper/css/zoom";

import { useProduct } from "../hooks/useProduct";
import { useStore } from "../hooks/useStore";
import { useIsAdmin } from "../lib/admin";
import { deleteProduct, updateProduct } from "../data/products";
import { useCategories } from "../hooks/useCategories";

type RouteParams = { productId: string };

const ProductDetails: React.FC = () => {
  const { productId } = useParams<RouteParams>();
  const history = useHistory();

  const { loading, product } = useProduct(productId);
  const { store } = useStore(product?.storeId);

  const { loading: adminLoading, isAdmin } = useIsAdmin();

  // 18+ session gate
  const is18Ok = () => sessionStorage.getItem("hm_18_ok") === "1";
  const isRestricted = (cat: string) => cat === "shotguns" || cat === "ammo";

  const [show18Alert, setShow18Alert] = useState(false);
  const [is18Verified, setIs18Verified] = useState(is18Ok());
  const { count: cartCount } = useCartCount();
  const [showImageModal, setShowImageModal] = useState(false);
  const { loading: categoriesLoading, categories } = useCategories();

  // Gallery state
  const [activeImg, setActiveImg] = useState(0);

  // UI state
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState<string>("");
  const [toast, setToast] = useState<string>("");

  // Admin product modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState<string>("0");
  const [pCategoryId, setPCategoryId] = useState("");
  const [pImages, setPImages] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pInStock, setPInStock] = useState(true);
  const [pSizes, setPSizes] = useState("");

  // Reset UI state when product changes
  useEffect(() => {
    setQty(1);
    setSize("");
    setActiveImg(0);
    setIs18Verified(is18Ok());
  }, [productId]);

  const openEdit = () => {
    if (!product) return;
    setPName(product.name);
    setPPrice(String(product.price));
    setPCategoryId(product.categoryId);
    setPImages((product.images || []).join("|"));
    setPDesc(product.description || "");
    setPInStock(product.inStock !== false);
    setPSizes((product.sizes || []).join("|"));
    setShowProductModal(true);
  };

  const saveProduct = async () => {
    if (!product) return;

    const name = pName.trim();
    const price = Number(pPrice);
    const categoryId = pCategoryId.trim();
    const images = pImages.split("|").map((x) => x.trim()).filter(Boolean);
    const description = pDesc.trim();
    const sizes = pSizes.split("|").map((x) => x.trim()).filter(Boolean);

    if (!name || !categoryId || !images.length || !description || !Number.isFinite(price)) {
      alert("Fill: name, price, categoryId, images, description.");
      return;
    }

    try {
      await updateProduct(product.id, {
        name,
        price,
        categoryId,
        storeId: product.storeId,
        images,
        description,
        inStock: pInStock,
        sizes: sizes.length ? sizes : undefined,
      });
      setShowProductModal(false);
    } catch (e: any) {
      alert(e?.message || "Could not save product");
    }
  };

  const removeProduct = async () => {
    if (!product) return;
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct(product.id);
      history.push("/home");
    } catch (e: any) {
      alert(e?.message || "Could not delete product");
    }
  };

  if (loading) {
    return (
      <IonPage>
        <AppHeader showBack backHref="/home" />
        <IonContent className="hm-content hm-camo">
          <div className="hm-wrap" style={{ paddingTop: 18 }}>
            <div className="stores-empty">Loading…</div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!product) {
    return (
      <IonPage>
        <AppHeader showBack backHref="/home" />
        <IonContent className="hm-content hm-camo">
          <div className="hm-wrap" style={{ paddingTop: 18 }}>
            <div style={{ color: "rgba(238,243,238,0.8)", fontWeight: 900 }}>Product not found.</div>
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
  };

  const primaryLabel =
    product.categoryId === "shotguns"
      ? "Purchase from store"
      : product.categoryId === "ammo"
      ? "Reserve in store"
      : "Add to cart";

  const storeName = store?.name || "Store";

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar className="hm-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>

          <IonTitle className="hm-app-title" onClick={() => history.push("/home")}>
            <span className="hm-brand">
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
            <div
              className="pd-heroimg"
              style={{ backgroundImage: `url(${product.images?.[activeImg] || ""})` }}
              onClick={() => setShowImageModal(true)}
              role="button"
            />

            {product.images?.length > 1 && (
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

          {/* Admin actions */}
          {!adminLoading && isAdmin && (
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <button className="pd-secondary" onClick={openEdit} type="button">
                Edit
              </button>
              <button className="pd-secondary" onClick={removeProduct} type="button">
                Delete
              </button>
            </div>
          )}

          {/* Main card */}
          <div className="pd-card">
            <div className="pd-top">
              <div>
                <div className="pd-title">{product.name}</div>
                <div className="pd-sub">
                  <IonIcon icon={storefrontOutline} />
                  <button
                    className="pd-storelink"
                    onClick={() => history.push(`/store/${product.storeId}`)}   // ✅ FIXED
                    type="button"
                  >
                    {storeName}
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
              <IonBadge className="pd-badge">{product.inStock !== false ? "In stock" : "Out of stock"}</IonBadge>

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
                    <button key={s} className={`pd-size ${size === s ? "active" : ""}`} onClick={() => setSize(s)} type="button">
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
              <div className="pd-footnote">Restricted category — age verification required. Purchase is handled by the store.</div>
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

        <IonModal isOpen={showImageModal} onDidDismiss={() => setShowImageModal(false)} backdropDismiss={true} className="hm-image-modal">
          <div className="hm-image-modal-content">
            <Swiper modules={[Zoom]} zoom={true} initialSlide={activeImg} spaceBetween={10} slidesPerView={1} className="hm-swiper">
              {product.images?.map((img, index) => (
                <SwiperSlide key={index}>
                  <div className="swiper-zoom-container">
                    <img src={img} alt={product.name} />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            <button className="hm-image-close" onClick={() => setShowImageModal(false)}>
              ✕
            </button>
          </div>
        </IonModal>

        {/* Admin edit modal */}
        <IonModal isOpen={showProductModal} onDidDismiss={() => setShowProductModal(false)}>
          <IonHeader translucent>
            <IonToolbar className="hm-toolbar">
              <div className="hm-wrap" style={{ padding: 14, fontWeight: 900 }}>Edit Product</div>
            </IonToolbar>
          </IonHeader>

          <IonContent className="hm-content hm-camo">
            <div className="hm-wrap" style={{ padding: 16, display: "grid", gap: 12 }}>
              <div>
                <IonLabel>Name</IonLabel>
                <IonInput value={pName} onIonInput={(e) => setPName(e.detail.value ?? "")} />
              </div>

              <div>
                <IonLabel>Price</IonLabel>
                <IonInput inputmode="decimal" value={pPrice} onIonInput={(e) => setPPrice(e.detail.value ?? "0")} />
              </div>

              <div>
                <IonLabel>Category</IonLabel>
                <IonSelect
                  value={pCategoryId}
                  interface="popover"
                  disabled={categoriesLoading || categories.length === 0}
                  onIonChange={(e) => setPCategoryId(e.detail.value)}
                >
                  {categories.map((c) => (
                    <IonSelectOption key={c.id} value={c.id}>
                      {c.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>

                {categories.length === 0 && (
                  <div className="pd-footnote" style={{ marginTop: 6 }}>
                    No categories found. Create categories in Firestore first.
                  </div>
                )}
              </div>

              <div>
                <IonLabel>Images (use |)</IonLabel>
                <IonInput value={pImages} onIonInput={(e) => setPImages(e.detail.value ?? "")} />
              </div>

              <div>
                <IonLabel>Description</IonLabel>
                <IonTextarea value={pDesc} onIonInput={(e) => setPDesc(e.detail.value ?? "")} />
              </div>

              <div>
                <IonLabel>Sizes (optional, use |)</IonLabel>
                <IonInput value={pSizes} onIonInput={(e) => setPSizes(e.detail.value ?? "")} />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button className={`hm-toggle ${pInStock ? "active" : ""}`} onClick={() => setPInStock((v) => !v)} type="button">
                  In stock
                </button>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button className="pd-primary" onClick={saveProduct} type="button">
                  Save
                </button>
                <button className="pd-secondary" onClick={() => setShowProductModal(false)} type="button">
                  Cancel
                </button>
              </div>
            </div>
          </IonContent>
        </IonModal>

        <IonToast isOpen={!!toast} message={toast} duration={1500} onDidDismiss={() => setToast("")} />
      </IonContent>
    </IonPage>
  );
};

export default ProductDetails;