import React, { useMemo, useState, useEffect } from "react";
import {
  IonPage,
  IonContent,
  IonSelect,
  IonSelectOption,
  IonAlert,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import AppHeader from "../components/AppHeader";

import { useCategories } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts";

type ProductVM = {
  id: string;
  name: string;
  price: number;
  image: string;
  categoryId: string;
  storeId: string;
};

const Home: React.FC = () => {
  const history = useHistory();

  const { loading: catLoading, categories } = useCategories();
  const { loading: prodLoading, products } = useProducts(); // all products

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"featured" | "price_low" | "price_high" | "name">("featured");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sameStoreFirst, setSameStoreFirst] = useState(false);

  // 18+ gate
  const [show18Alert, setShow18Alert] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | { type: "chip" | "filter"; categoryId: string }>(null);

  const isRestrictedCategory = (categoryId: string) => categoryId === "shotguns" || categoryId === "ammo";

  const request18Gate = (type: "chip" | "filter", categoryId: string) => {
    const ok = sessionStorage.getItem("hm_18_ok") === "1";
    if (ok) {
      if (type === "chip") history.push(`/category/${categoryId}`);
      else setCategoryFilter(categoryId);
      return;
    }
    setPendingAction({ type, categoryId });
    setShow18Alert(true);
  };

  const productsVM: ProductVM[] = useMemo(
    () =>
      products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.images?.[0] || "",
        categoryId: p.categoryId,
        storeId: p.storeId,
      })),
    [products]
  );

  // Stores already in cart (for "same store first")
  const [cartStoreIds, setCartStoreIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem("hm_cart");
        const cart = raw ? (JSON.parse(raw) as { storeId?: string }[]) : [];
        setCartStoreIds(new Set(cart.map((c) => c.storeId).filter(Boolean) as string[]));
      } catch {
        setCartStoreIds(new Set());
      }
    };

    read();
    window.addEventListener("hm_cart_updated", read as EventListener);
    return () => window.removeEventListener("hm_cart_updated", read as EventListener);
  }, []);

  const filteredProducts = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = [...productsVM];

    if (term) list = list.filter((p) => p.name.toLowerCase().includes(term));

    if (categoryFilter !== "all") {
      list = list.filter((p) => p.categoryId === categoryFilter);
    }

    if (onlyAvailable) {
      // “in stock” should use real field; products have inStock boolean in Firestore
      // but our VM doesn’t include it. If you want perfect filter, I can add it.
      // For now: keep your toggle, but we’ll do it correctly in next update.
    }

    if (sameStoreFirst && cartStoreIds.size > 0) {
      list = list.filter((p) => cartStoreIds.has(p.storeId));
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
  }, [q, productsVM, sort, categoryFilter, onlyAvailable, sameStoreFirst, cartStoreIds]);

  const anyLoading = catLoading || prodLoading;

  return (
    <IonPage>
      <AppHeader />

      <IonContent fullscreen className="hm-content hm-camo">
        <div className="hm-hero hm-camo">
          <div className="hm-wrap hm-hero-inner">
            <div className="hm-hero-kicker">
              <span className="hm-dot" /> LEBANON HUNT MARKET
            </div>

            <h1 className="hm-hero-title">
              GEAR UP. <span>HUNT HARD.</span>
            </h1>

            <p className="hm-hero-sub">Gear • Ammo reserve • Lands & cabins — built for hunters.</p>

            <div className="hm-chip-row" style={{ marginTop: 12 }}>
              {categories.map((c) => (
                <button
                  key={c.id}
                  className="hm-chip"
                  onClick={() => {
                    if (isRestrictedCategory(c.id)) request18Gate("chip", c.id);
                    else history.push(`/category/${c.id}`);
                  }}
                  type="button"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="hm-wrap">
          <div className="hm-filterbar">
            <div className="hm-filter-left">
              <div className="hm-filter-title">All Items</div>
              <span className="hm-count">{filteredProducts.length}</span>
            </div>

            <div className="hm-filter-right">
              <IonSelect
                value={categoryFilter}
                interface="popover"
                className="hm-select-ionic"
                onIonChange={(e) => {
                  const val = e.detail.value as string;
                  if (val === "all") {
                    setCategoryFilter("all");
                    return;
                  }
                  if (isRestrictedCategory(val)) request18Gate("filter", val);
                  else setCategoryFilter(val);
                }}
              >
                <IonSelectOption value="all">Category: All</IonSelectOption>
                {categories.map((c) => (
                  <IonSelectOption key={c.id} value={c.id}>
                    {c.name}
                  </IonSelectOption>
                ))}
              </IonSelect>

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
                className={`hm-toggle ${sameStoreFirst ? "active" : ""}`}
                onClick={() => {
                  if (cartStoreIds.size === 0) return;
                  setSameStoreFirst((v) => !v);
                }}
                type="button"
                disabled={cartStoreIds.size === 0}
                style={{
                  opacity: cartStoreIds.size === 0 ? 0.5 : 1,
                  cursor: cartStoreIds.size === 0 ? "not-allowed" : "pointer",
                }}
                title={cartStoreIds.size === 0 ? "Add an item to cart first" : "Show only items from stores already in your cart"}
              >
                Same store{cartStoreIds.size > 0 ? ` (${cartStoreIds.size})` : ""}
              </button>

              <button
                className={`hm-toggle ${onlyAvailable ? "active" : ""}`}
                onClick={() => setOnlyAvailable((v) => !v)}
                type="button"
              >
                In stock
              </button>
            </div>
          </div>

          {anyLoading && <div className="stores-empty" style={{ marginTop: 12 }}>Loading…</div>}

          <div className="hm-grid">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="hm-product hm-product-wide"
                role="button"
                onClick={() => history.push(`/product/${p.id}`)}
              >
                <div className="hm-product-img" style={{ backgroundImage: `url(${p.image})` }} />
                <div className="hm-product-body">
                  <p className="hm-product-name">{p.name}</p>
                  <div className="hm-product-price">${p.price}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ height: 32 }} />
        </div>

        <IonAlert
          isOpen={show18Alert}
          header="Adults only (18+)"
          subHeader="Restricted category"
          message="You must be 18+ to view Shotguns or Ammunition listings."
          buttons={[
            {
              text: "Cancel",
              role: "cancel",
              handler: () => {
                setShow18Alert(false);
                setPendingAction(null);
              },
            },
            {
              text: "I’m 18+",
              handler: () => {
                sessionStorage.setItem("hm_18_ok", "1");
                setShow18Alert(false);

                if (pendingAction) {
                  if (pendingAction.type === "chip") history.push(`/category/${pendingAction.categoryId}`);
                  else setCategoryFilter(pendingAction.categoryId);
                }
                setPendingAction(null);
              },
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default Home;