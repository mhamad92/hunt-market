import React, { useMemo, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonAlert,
} from "@ionic/react";
import { cartOutline } from "ionicons/icons";
import { useHistory } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { PRODUCTS } from "../data/products";


type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  categoryId: string;
  storeId: string;
  storeName: string; // not shown on home cards
};

type Category = { id: string; name: string };

const Home: React.FC = () => {
  const history = useHistory();

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"featured" | "price_low" | "price_high" | "name">("featured");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false); // placeholder for later
  const [sameStoreFirst, setSameStoreFirst] = useState<boolean>(true);

  // 18+ gate
  const [show18Alert, setShow18Alert] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | { type: "chip" | "filter"; categoryId: string }>(null);

  const categories: Category[] = useMemo(
    () => [
      { id: "clothing", name: "Clothing" },
      { id: "shoes", name: "Shoes" },
      { id: "optics", name: "Optics" },
      { id: "camping", name: "Camping" },
      { id: "calls", name: "Calls" },
      { id: "ammo", name: "Ammunition" },
      { id: "shotguns", name: "Shotguns" },
    ],
    []
  );

  const isRestrictedCategory = (categoryId: string) =>
    categoryId === "shotguns" || categoryId === "ammo";

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

  // Mock data (replace with Firestore later)
  const products = useMemo(() => PRODUCTS.map(p => ({
  id: p.id,
  name: p.name,
  price: p.price,
  image: p.images[0],
  categoryId: p.categoryId,
  storeId: p.storeId,
  storeName: p.storeName,
})), []);

  // Stores already in cart (for "same store first")
  const cartStoreIds = useMemo(() => {
    try {
      const raw = localStorage.getItem("hm_cart");
      if (!raw) return new Set<string>();
      const cart = JSON.parse(raw) as { storeId?: string }[];
      return new Set(cart.map((c) => c.storeId).filter(Boolean) as string[]);
    } catch {
      return new Set<string>();
    }
  }, []);

  const filteredProducts = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = [...products];

    if (term) list = list.filter((p) => p.name.toLowerCase().includes(term));

    if (categoryFilter !== "all") {
      list = list.filter((p) => p.categoryId === categoryFilter);
    }

    if (onlyAvailable) list = list.filter((p) => p.price > 0);

    if (sameStoreFirst && cartStoreIds.size > 0) {
      list.sort((a, b) => {
        const aP = cartStoreIds.has(a.storeId) ? 1 : 0;
        const bP = cartStoreIds.has(b.storeId) ? 1 : 0;
        return bP - aP;
      });
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
  }, [q, products, sort, categoryFilter, onlyAvailable, sameStoreFirst, cartStoreIds]);

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
        if (isRestrictedCategory(c.id)) {
          request18Gate("chip", c.id);
        } else {
          history.push(`/category/${c.id}`);
        }
      }}
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
                onClick={() => setSameStoreFirst((v) => !v)}
                type="button"
                title="Prioritize items from stores already in your cart"
              >
                Same store
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