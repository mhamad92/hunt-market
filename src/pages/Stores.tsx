import React, { useMemo, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonSearchbar,
  IonModal,
  IonButton,
  IonInput,
  IonLabel,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { chevronForwardOutline } from "ionicons/icons";
import { IonIcon } from "@ionic/react";

import { useStores } from "../hooks/useStores";
import { useProducts } from "../hooks/useProducts";
import { useIsAdmin } from "../lib/admin";
import { deleteStore, upsertStoreWithId, updateStore, type Store, type StoreAddress } from "../data/stores";

type StorePreviewItem = { id: string; image: string; name: string };
type StoreVM = Store & { previewItems: StorePreviewItem[] };

const FALLBACK_STORE_IMG =
  "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=1200&q=60";

const Stores: React.FC = () => {
  const history = useHistory();
  const [q, setQ] = useState("");

  const { loading: storesLoading, stores } = useStores();
  const { products } = useProducts(); // all products
  const { loading: adminLoading, isAdmin } = useIsAdmin();

  // ADMIN modal state
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);

  const [sId, setSId] = useState(""); // optional custom id if creating
  const [sName, setSName] = useState("");
  const [sPhone, setSPhone] = useState("");

  // address fields (required: region/city/area/street)
  const [aRegion, setARegion] = useState("");
  const [aCity, setACity] = useState("");
  const [aArea, setAArea] = useState("");
  const [aStreet, setAStreet] = useState("");
  const [aBuilding, setABuilding] = useState("");
  const [aFloor, setAFloor] = useState("");
  const [aNotes, setANotes] = useState("");

  const [sImage, setSImage] = useState(""); // optional URL

  const openCreateStore = () => {
    setEditingStoreId(null);
    setSId("");
    setSName("");
    setSPhone("");

    setARegion("");
    setACity("");
    setAArea("");
    setAStreet("");
    setABuilding("");
    setAFloor("");
    setANotes("");

    setSImage("");
    setShowStoreModal(true);
  };

  const openEditStore = (s: Store) => {
    setEditingStoreId(s.id);
    setSId(s.id);
    setSName(s.name);
    setSPhone(s.phone);

    setARegion(s.address?.region ?? "");
    setACity(s.address?.city ?? "");
    setAArea(s.address?.area ?? "");
    setAStreet(s.address?.street ?? "");
    setABuilding(s.address?.building ?? "");
    setAFloor(s.address?.floor ?? "");
    setANotes(s.address?.notes ?? "");

    setSImage(s.image ?? "");
    setShowStoreModal(true);
  };

  const saveStore = async () => {
    const name = sName.trim();
    const phone = sPhone.trim();
    const id = (editingStoreId ? editingStoreId : sId.trim() || `store_${Date.now()}`).toLowerCase();

    const address: StoreAddress = {
      region: aRegion.trim(),
      city: aCity.trim(),
      area: aArea.trim(),
      street: aStreet.trim(),
      building: aBuilding.trim() || undefined,
      floor: aFloor.trim() || undefined,
      notes: aNotes.trim() || undefined,
    };

    const image = sImage.trim() || undefined;

    if (!name) return alert("Store name is required.");
    if (!phone) return alert("Store phone is required.");
    if (!address.region) return alert("Store region is required.");
    if (!address.city) return alert("Store city is required.");
    if (!address.area) return alert("Store area is required.");
    if (!address.street) return alert("Store street is required.");
    if (/\s/.test(id)) return alert("Store ID must not contain spaces.");

    try {
      if (editingStoreId) {
        await updateStore(editingStoreId, { name, phone, address, image });
      } else {
        await upsertStoreWithId(id, { name, phone, address, image });
      }
      setShowStoreModal(false);
    } catch (e: any) {
      alert(e?.message || "Could not save store");
    }
  };

  const removeStore = async (storeId: string) => {
    if (!confirm("Delete this store? Products will still exist but will be invalid until fixed.")) return;
    try {
      await deleteStore(storeId);
    } catch (e: any) {
      alert(e?.message || "Could not delete store");
    }
  };

  // Build store previews from products
  const storesVM: StoreVM[] = useMemo(() => {
    const byStore = new Map<string, StorePreviewItem[]>();
    for (const p of products) {
      const arr = byStore.get(p.storeId) ?? [];
      arr.push({
        id: p.id,
        image: p.images?.[0] || "",
        name: p.name,
      });
      byStore.set(p.storeId, arr);
    }

    return stores.map((s) => ({
      ...s,
      previewItems: (byStore.get(s.id) ?? []).slice(0, 6),
    }));
  }, [stores, products]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return storesVM;

    return storesVM.filter((s) => {
      const region = s.address?.region ?? "";
      const city = s.address?.city ?? "";
      const area = s.address?.area ?? "";
      return `${s.name} ${region} ${city} ${area}`.toLowerCase().includes(term);
    });
  }, [q, storesVM]);

  return (
    <IonPage>
      <AppHeader showBack backHref="/home" />

      <IonHeader translucent>
        <IonToolbar className="hm-toolbar">
          <div className="hm-wrap" style={{ padding: "8px 18px", display: "flex", gap: 10, alignItems: "center" }}>
            <IonSearchbar
              className="hm-search"
              value={q}
              placeholder="Search stores or locations..."
              onIonInput={(e) => setQ(e.detail.value ?? "")}
            />

            {!adminLoading && isAdmin && (
              <IonButton onClick={openCreateStore} style={{ whiteSpace: "nowrap" }}>
                + Store
              </IonButton>
            )}
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="hm-content hm-camo">
        <div className="hm-wrap" style={{ paddingTop: 14, paddingBottom: 28 }}>
          <div className="stores-title">
            Stores <span className="stores-count">{filtered.length}</span>
          </div>

          {storesLoading && (
            <div className="stores-empty" style={{ marginTop: 12 }}>
              Loading…
            </div>
          )}

          <div className="stores-list">
            {filtered.map((s) => {
              const region = s.address?.region ?? "";
              const logo = s.image || FALLBACK_STORE_IMG;

              return (
                <div key={s.id} className="store-card">
                  <button className="store-top" onClick={() => history.push(`/store/${s.id}`)} type="button">
                    <div className="store-logo" style={{ backgroundImage: `url(${logo})` }} aria-hidden="true" />
                    <div className="store-meta">
                      <div className="store-name">{s.name}</div>
                      <div className="store-sub">{region}</div>
                    </div>
                    <div className="store-view">
                      View <IonIcon icon={chevronForwardOutline} />
                    </div>
                  </button>

                  {/* Admin actions */}
                  {!adminLoading && isAdmin && (
                    <div style={{ display: "flex", gap: 8, padding: "0 14px 12px" }}>
                      <button className="pd-secondary" onClick={() => openEditStore(s)} type="button">
                        Edit
                      </button>
                      <button className="pd-secondary" onClick={() => removeStore(s.id)} type="button">
                        Delete
                      </button>
                    </div>
                  )}

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
                            style={{ backgroundImage: `url(${it.image || FALLBACK_STORE_IMG})` }}
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
              );
            })}
          </div>

          {!filtered.length && !storesLoading && <div className="stores-empty">No stores match “{q.trim()}”</div>}
        </div>

        {/* Admin Store Modal */}
        <IonModal isOpen={showStoreModal} onDidDismiss={() => setShowStoreModal(false)}>
          <IonHeader translucent>
            <IonToolbar className="hm-toolbar">
              <div className="hm-wrap" style={{ padding: 14, fontWeight: 900 }}>
                {editingStoreId ? "Edit Store" : "Add Store"}
              </div>
            </IonToolbar>
          </IonHeader>

          <IonContent className="hm-content hm-camo">
            <div className="hm-wrap" style={{ padding: 16, display: "grid", gap: 12 }}>
              {!editingStoreId && (
                <div>
                  <IonLabel>Store ID (no spaces)</IonLabel>
                  <IonInput value={sId} placeholder="store_1" onIonInput={(e) => setSId(e.detail.value ?? "")} />
                </div>
              )}

              <div>
                <IonLabel>Name</IonLabel>
                <IonInput value={sName} onIonInput={(e) => setSName(e.detail.value ?? "")} />
              </div>

              <div>
                <IonLabel>Phone</IonLabel>
                <IonInput value={sPhone} onIonInput={(e) => setSPhone(e.detail.value ?? "")} />
              </div>

              <div>
                <IonLabel>Region</IonLabel>
                <IonInput value={aRegion} onIonInput={(e) => setARegion(e.detail.value ?? "")} />
              </div>

              <div>
                <IonLabel>City</IonLabel>
                <IonInput value={aCity} onIonInput={(e) => setACity(e.detail.value ?? "")} />
              </div>

              <div>
                <IonLabel>Area</IonLabel>
                <IonInput value={aArea} onIonInput={(e) => setAArea(e.detail.value ?? "")} />
              </div>

              <div>
                <IonLabel>Street</IonLabel>
                <IonInput value={aStreet} onIonInput={(e) => setAStreet(e.detail.value ?? "")} />
              </div>

              <div>
                <IonLabel>Building (optional)</IonLabel>
                <IonInput value={aBuilding} onIonInput={(e) => setABuilding(e.detail.value ?? "")} />
              </div>

              <div>
                <IonLabel>Floor (optional)</IonLabel>
                <IonInput value={aFloor} onIonInput={(e) => setAFloor(e.detail.value ?? "")} />
              </div>

              <div>
                <IonLabel>Notes (optional)</IonLabel>
                <IonInput value={aNotes} onIonInput={(e) => setANotes(e.detail.value ?? "")} />
              </div>

              <div>
                <IonLabel>Image URL (optional)</IonLabel>
                <IonInput value={sImage} onIonInput={(e) => setSImage(e.detail.value ?? "")} />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button className="pd-primary" onClick={saveStore} type="button">
                  Save
                </button>
                <button className="pd-secondary" onClick={() => setShowStoreModal(false)} type="button">
                  Cancel
                </button>
              </div>
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Stores;