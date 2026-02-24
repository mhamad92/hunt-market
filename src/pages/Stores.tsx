import React, { useMemo, useState } from "react";
import { IonPage, IonHeader, IonToolbar, IonContent, IonSearchbar, IonIcon } from "@ionic/react";
import { useHistory } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { PRODUCTS } from "../data/products";
import { STORES, StoreBase } from "../data/stores";
import { chevronForwardOutline } from "ionicons/icons";


type StorePreviewItem = {
  id: string;
  image: string;
  name: string;
};
type StoreVM = StoreBase & { previewItems: StorePreviewItem[] };

const Stores: React.FC = () => {
  const history = useHistory();
  const [q, setQ] = useState("");

  // Build stores with preview items from PRODUCTS
  const stores: StoreVM[] = useMemo(() => {
    // group products by storeId
    const byStore = new Map<string, StorePreviewItem[]>();

    for (const p of PRODUCTS) {
      const arr = byStore.get(p.storeId) ?? [];
     arr.push({
      id: p.id,
     image: p.images?.[0] || "",
      name: p.name,
      });
      byStore.set(p.storeId, arr);
    }

    // attach previewItems to STORES (take first 6 items per store)
    return STORES.map((s) => ({
      ...s,
      previewItems: (byStore.get(s.id) ?? []).slice(0, 6),
    }));
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return stores;
    return stores.filter((s) =>
      `${s.name} ${s.region}`.toLowerCase().includes(term)
    );
  }, [q, stores]);

  return (
    <IonPage>
      <AppHeader showBack backHref="/home" />

      <IonHeader translucent>
        <IonToolbar className="hm-toolbar">
          <div className="hm-wrap" style={{ padding: "8px 18px" }}>
            <IonSearchbar
              className="hm-search"
              value={q}
              placeholder="Search stores or regions..."
              onIonInput={(e) => setQ(e.detail.value ?? "")}
            />
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="hm-content hm-camo">
        <div className="hm-wrap" style={{ paddingTop: 14, paddingBottom: 28 }}>
          <div className="stores-title">
            Stores <span className="stores-count">{filtered.length}</span>
          </div>

          <div className="stores-list">
            {filtered.map((s) => (
              <div key={s.id} className="store-card">
                <button
                  className="store-top"
                  onClick={() => history.push(`/store/${s.id}`)}
                  type="button"
                >
                  <div
                    className="store-logo"
                    style={{ backgroundImage: `url(${s.logo})` }}
                    aria-hidden="true"
                  />
                  <div className="store-meta">
                    <div className="store-name">{s.name}</div>
                    <div className="store-sub">{s.region}</div>
                  </div>
                  <div className="store-view">
                        View <IonIcon icon={chevronForwardOutline} />
                  </div>
                </button>

                <div className="store-preview">
                  {s.previewItems.length ? (
                    s.previewItems.map((it) => (
                      <button
                        key={it.id}
                        className="store-mini"
                        onClick={() => history.push(`/product/${it.id}`)}
                        type="button"
                        aria-label="Open product"
                      >
                        <div
                          className="store-mini-img"
                          style={{ backgroundImage: `url(${it.image})` }}
                          aria-hidden="true"
                        />
                        <div className="store-mini-name">{it.name}</div>
                      </button>
                    ))
                  ) : (
                    <div className="stores-empty" style={{ padding: "0 14px 14px" }}>
                      No items yet
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!filtered.length && (
            <div className="stores-empty">No stores match “{q.trim()}”</div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Stores;