import React, { useMemo, useState } from "react";
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonAlert,
} from "@ionic/react";
import { useHistory, useParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { STORES } from "../data/stores";
import { PRODUCTS } from "../data/products";

type RouteParams = { storeId: string };

const isRestrictedCategory = (categoryId: string) =>
  categoryId === "ammo" || categoryId === "shotguns";

const is18Ok = () => sessionStorage.getItem("hm_18_ok") === "1";

const StoreDetails: React.FC = () => {
  const history = useHistory();
  const { storeId } = useParams<RouteParams>();

  const store = useMemo(() => STORES.find((s) => s.id === storeId), [storeId]);

  const storeProducts = useMemo(
    () => PRODUCTS.filter((p) => p.storeId === storeId),
    [storeId]
  );

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");

  // 18+ gate
  const [show18Alert, setShow18Alert] = useState(false);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);

  const categoriesInStore = useMemo(() => {
    const set = new Set(storeProducts.map((p) => p.categoryId));
    return Array.from(set.values()).sort();
  }, [storeProducts]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = [...storeProducts];

    if (term) {
      list = list.filter((p) =>
        `${p.name} ${p.description}`.toLowerCase().includes(term)
      );
    }

    if (category !== "all") {
      list = list.filter((p) => p.categoryId === category);
    }

    return list;
  }, [storeProducts, q, category]);

  const openProduct = (productId: string) => {
    history.push(`/product/${productId}`);
  };

  const handleProductClick = (productId: string) => {
    const p = storeProducts.find((x) => x.id === productId);
    if (!p) return;

    if (isRestrictedCategory(p.categoryId) && !is18Ok()) {
      setPendingProductId(productId);
      setShow18Alert(true);
      return;
    }

    openProduct(productId);
  };

  if (!store) {
    return (
      <IonPage>
        <AppHeader showBack backHref="/stores" />
        <IonContent className="hm-content hm-camo">
          <div className="hm-wrap" style={{ paddingTop: 18 }}>
            <div style={{ color: "rgba(238,243,238,0.85)", fontWeight: 1000 }}>
              Store not found.
            </div>
            <button
              className="pd-primary"
              style={{ marginTop: 12 }}
              onClick={() => history.push("/stores")}
              type="button"
            >
              Back to Stores
            </button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <AppHeader showBack backHref="/stores" />

      {/* Sticky search + filter toolbar */}
      <IonHeader translucent>
        <IonToolbar className="hm-toolbar">
          <div className="hm-wrap" style={{ padding: "8px 18px", display: "flex", gap: 10 }}>
            <IonSearchbar
              className="hm-search"
              value={q}
              placeholder="Search this store..."
              onIonInput={(e) => setQ(e.detail.value ?? "")}
            />

            <IonSelect
              value={category}
              interface="popover"
              className="hm-select-ionic"
              onIonChange={(e) => setCategory(e.detail.value)}
            >
              <IonSelectOption value="all">All</IonSelectOption>
              {categoriesInStore.map((c) => (
                <IonSelectOption key={c} value={c}>
                  {c}
                </IonSelectOption>
              ))}
            </IonSelect>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="hm-content hm-camo">
        <div className="hm-wrap" style={{ paddingTop: 14, paddingBottom: 26 }}>
          {/* Store hero */}
          <div className="sd-hero sd-hero-banner">
  <div
    className="sd-banner"
    style={{
      backgroundImage: `url(${storeProducts[0]?.images?.[0] || store.logo})`,
    }}
    aria-hidden="true"
  />
  <div className="sd-hero-inner">
    <div
      className="sd-logo"
      style={{ backgroundImage: `url(${store.logo})` }}
      aria-hidden="true"
    />

    <div className="sd-meta">
      <div className="sd-name">{store.name}</div>
      <div className="sd-region">{store.region}</div>

      <div className="sd-actions">
        <button className="sd-btn" onClick={() => history.push("/cart")} type="button">
          View cart
        </button>
        <button
          className="sd-btn ghost"
          onClick={() => alert("Add WhatsApp / Call / Map next")}
          type="button"
        >
          Contact store
        </button>
      </div>
    </div>

    <div className="sd-stats">
      <div className="sd-stat">
        <div className="sd-stat-num">{storeProducts.length}</div>
        <div className="sd-stat-lbl">Items</div>
      </div>
      <div className="sd-stat">
        <div className="sd-stat-num">{categoriesInStore.length}</div>
        <div className="sd-stat-lbl">Categories</div>
      </div>
    </div>
  </div>
</div>

          {/* Products */}
          <div className="sd-row">
            <div className="sd-title">
              Products <span className="sd-count">{filtered.length}</span>
            </div>
          </div>
                 <div className="sd-chips">
  <button
    className={`sd-chip ${category === "all" ? "active" : ""}`}
    onClick={() => setCategory("all")}
    type="button"
  >
    All
  </button>

  {categoriesInStore.map((c) => (
    <button
      key={c}
      className={`sd-chip ${category === c ? "active" : ""}`}
      onClick={() => setCategory(c)}
      type="button"
    >
      {c}
    </button>
  ))}
</div>

          <div className="hm-grid">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="hm-product hm-product-wide sd-product"
                role="button"
                onClick={() => handleProductClick(p.id)}
              >
                <div className="hm-product-img">
                 <img className="hm-product-img-el"
                    src={p.images?.[0] || ""}
                  alt={p.name}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=1200&q=60";
                  }}
  />
              <div className="hm-product-img-overlay" />
                </div>

                <div className="hm-product-body">
                  <p className="hm-product-name">{p.name}</p>

                  <div className="sd-bottom">
                    <div className="hm-product-price">${p.price}</div>

                    {(p.categoryId === "ammo" || p.categoryId === "shotguns") && (
                      <span className="sd-pill warn">18+</span>
                    )}
                  </div>

                  {!p.inStock && <div className="sd-pill">Out of stock</div>}
                </div>
              </div>
            ))}
          </div>

          {!filtered.length && (
            <div className="stores-empty" style={{ marginTop: 14 }}>
              No items match “{q.trim()}”
            </div>
          )}
        </div>

        {/* 18+ gate */}
        <IonAlert
          isOpen={show18Alert}
          header="Adults only (18+)"
          subHeader="Restricted category"
          message="You must be 18+ to view Shotguns or Ammunition."
          buttons={[
            {
              text: "Cancel",
              role: "cancel",
              handler: () => {
                setShow18Alert(false);
                setPendingProductId(null);
              },
            },
            {
              text: "I’m 18+",
              handler: () => {
                sessionStorage.setItem("hm_18_ok", "1");
                setShow18Alert(false);
                if (pendingProductId) openProduct(pendingProductId);
                setPendingProductId(null);
              },
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default StoreDetails;