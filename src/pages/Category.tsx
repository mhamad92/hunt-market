import React, { useMemo, useState } from "react";
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonAlert,
} from "@ionic/react";
import { useHistory, useParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";

import { useCategories } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts"; // ✅ use this

type RouteParams = { categoryId: string };

const isRestrictedCategory = (categoryId: string) =>
  categoryId === "ammo" || categoryId === "shotguns";

const is18Ok = () => sessionStorage.getItem("hm_18_ok") === "1";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=1200&q=60";

const CategoryPage: React.FC = () => {
  const history = useHistory();
  const { categoryId } = useParams<RouteParams>();

  const { categories } = useCategories();
  const category = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId]
  );

  // ✅ get products filtered by categoryId
  const { loading, products } = useProducts({ categoryId });

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"featured" | "price_low" | "price_high" | "name">("featured");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // 18+ gate
  const [show18Alert, setShow18Alert] = useState(false);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = [...products];

    if (term) {
      list = list.filter((p) =>
        `${p.name} ${p.description ?? ""}`.toLowerCase().includes(term)
      );
    }

    if (onlyAvailable) {
      list = list.filter((p) => p.inStock !== false);
    }

    switch (sort) {
      case "price_low":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price_high":
        list.sort((a, b) => b.price - a.price);
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return list;
  }, [products, q, sort, onlyAvailable]);

  const openProduct = (productId: string) => history.push(`/product/${productId}`);

  const handleProductClick = (productId: string) => {
    if (isRestrictedCategory(categoryId) && !is18Ok()) {
      setPendingProductId(productId);
      setShow18Alert(true);
      return;
    }
    openProduct(productId);
  };

  const categoryTitle = category?.name || categoryId;

  return (
    <IonPage>
      <AppHeader showBack backHref="/home" />

      <IonHeader translucent>
        <IonToolbar className="hm-toolbar">
          <div
            className="hm-wrap"
            style={{ padding: "8px 18px", display: "flex", gap: 10, flexWrap: "wrap" }}
          >
            <IonSearchbar
              className="hm-search"
              value={q}
              placeholder={`Search in ${categoryTitle}...`}
              onIonInput={(e) => setQ(e.detail.value ?? "")}
            />

            <IonSelect
              value={sort}
              interface="popover"
              className="hm-select-ionic"
              onIonChange={(e) => setSort(e.detail.value)}
            >
              <IonSelectOption value="featured">Sort: Featured</IonSelectOption>
              <IonSelectOption value="price_low">Sort: Price ↑</IonSelectOption>
              <IonSelectOption value="price_high">Sort: Price ↓</IonSelectOption>
              <IonSelectOption value="name">Sort: Name A–Z</IonSelectOption>
            </IonSelect>

            <button
              className={`hm-toggle ${onlyAvailable ? "active" : ""}`}
              onClick={() => setOnlyAvailable((v) => !v)}
              type="button"
            >
              In stock
            </button>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="hm-content hm-camo">
        <div className="hm-wrap" style={{ paddingTop: 14, paddingBottom: 26 }}>
          <div className="sd-row" style={{ marginBottom: 6 }}>
            <div className="sd-title">
              {categoryTitle} <span className="sd-count">{filtered.length}</span>
            </div>
          </div>

          {isRestrictedCategory(categoryId) && (
            <div className="pd-footnote" style={{ marginTop: 8 }}>
              Restricted category — 18+ required. Purchases/reservations are handled by the store.
            </div>
          )}

          {loading && (
            <div className="stores-empty" style={{ marginTop: 12 }}>
              Loading…
            </div>
          )}

          <div className="hm-grid" style={{ marginTop: 14 }}>
            {filtered.map((p) => (
              <div
                key={p.id}
                className="hm-product hm-product-wide sd-product"
                role="button"
                onClick={() => handleProductClick(p.id)}
              >
                <div className="hm-product-img">
                  <img
                    className="hm-product-img-el"
                    src={p.images?.[0] || FALLBACK_IMG}
                    alt={p.name}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                    }}
                  />
                  <div className="hm-product-img-overlay" />
                </div>

                <div className="hm-product-body">
                  <p className="hm-product-name">{p.name}</p>

                  <div
                    className="sd-bottom"
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <div className="hm-product-price">${p.price}</div>

                    {isRestrictedCategory(p.categoryId) && (
                      <span className="sd-pill warn">18+</span>
                    )}
                  </div>

                  {p.inStock === false && <div className="sd-pill">Out of stock</div>}
                </div>
              </div>
            ))}
          </div>

          {!filtered.length && !loading && (
            <div className="stores-empty" style={{ marginTop: 14 }}>
              No items match “{q.trim()}”
            </div>
          )}
        </div>

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

export default CategoryPage;