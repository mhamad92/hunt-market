import React, { useMemo, useState } from "react";
import { IonPage, IonContent, IonModal, IonInput, IonLabel, IonTextarea } from "@ionic/react";
import { useIsAdmin } from "../lib/admin";
import { useStores } from "../hooks/useStores";
import { deleteStore, upsertStoreWithId, updateStore, type StoreAddress } from "../data/stores";

const FieldShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ background: "#fff", borderRadius: 12, padding: 10, border: "1px solid rgba(0,0,0,0.10)" }}>
    {children}
  </div>
);

const AdminStores: React.FC = () => {
  const { loading: adminLoading, isAdmin } = useIsAdmin();
  const { stores, loading } = useStores() as any;

  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // fields
  const [sId, setSId] = useState("");
  const [sName, setSName] = useState("");
  const [sPhone, setSPhone] = useState("");

  // address (required: region/city/area/street)
  const [aRegion, setARegion] = useState("");
  const [aCity, setACity] = useState("");
  const [aArea, setAArea] = useState("");
  const [aStreet, setAStreet] = useState("");

  // optional address details
  const [aBuilding, setABuilding] = useState("");
  const [aFloor, setAFloor] = useState("");
  const [aNotes, setANotes] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return stores;

    return (stores || []).filter((s: any) => {
      const addr = s.address || {};
      const hay = [
        s.id,
        s.name,
        s.phone,
        addr.region,
        addr.city,
        addr.area,
        addr.street,
        addr.building,
        addr.floor,
        addr.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(term);
    });
  }, [stores, q]);

  const clearForm = () => {
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
  };

  const openCreate = () => {
    setEditingId(null);
    clearForm();
    setShowModal(true);
  };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setSId(s.id);
    setSName(s.name || "");
    setSPhone(s.phone || "");

    const a = (s.address || {}) as StoreAddress;
    setARegion(a.region || "");
    setACity(a.city || "");
    setAArea(a.area || "");
    setAStreet(a.street || "");
    setABuilding(a.building || "");
    setAFloor(a.floor || "");
    setANotes(a.notes || "");

    setShowModal(true);
  };

  const save = async () => {
    const name = sName.trim();
    const id = (editingId ? editingId : sId.trim()).toLowerCase();
    const phone = sPhone.trim();

    const address: StoreAddress = {
      region: aRegion.trim(),
      city: aCity.trim(),
      area: aArea.trim(),
      street: aStreet.trim(),
      building: aBuilding.trim() || undefined,
      floor: aFloor.trim() || undefined,
      notes: aNotes.trim() || undefined,
    };

    if (!name || !id) return alert("Fill: Store ID and Name");
    if (/\s/.test(id)) return alert("Store ID must not contain spaces.");

    // required now
    if (!phone) return alert("Phone is required.");
    if (!address.region || !address.city || !address.area || !address.street) {
      return alert("Address is required: region, city, area, street.");
    }

    try {
      const payload = { name, phone, address };

      if (editingId) await updateStore(editingId, payload);
      else await upsertStoreWithId(id, payload);

      setShowModal(false);
    } catch (e: any) {
      alert(e?.message || "Could not save store");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this store?")) return;
    try {
      await deleteStore(id);
    } catch (e: any) {
      alert(e?.message || "Could not delete store");
    }
  };

  return (
    <IonPage>
      <IonContent className="admin-page">
        <div className="admin-container">
          <div className="admin-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 1000, fontSize: 18 }}>Stores</div>
                <div style={{ opacity: 0.75, marginTop: 4 }}>{filtered.length} total</div>
              </div>

              {!adminLoading && isAdmin && (
                <button className="admin-btn" onClick={openCreate} type="button">
                  + Add Store
                </button>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <FieldShell>
                <IonInput value={q} placeholder="Search stores..." onIonInput={(e) => setQ(e.detail.value ?? "")} />
              </FieldShell>
            </div>

            {adminLoading || loading ? (
              <div style={{ marginTop: 12, opacity: 0.75 }}>Loading…</div>
            ) : !isAdmin ? (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#fff3cd", color: "#7a5b00" }}>
                No access. You must be an admin.
              </div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {filtered.map((s: any) => {
                  const a = s.address || {};
                  const addrLine = [a.region, a.city, a.area, a.street].filter(Boolean).join(" • ");

                  return (
                    <div key={s.id} className="admin-card" style={{ background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 1000 }}>{s.name}</div>
                          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
                            ID: {s.id}
                            {s.phone ? ` • ${s.phone}` : ""}
                            {addrLine ? ` • ${addrLine}` : ""}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button className="admin-btn" onClick={() => openEdit(s)} type="button">
                            Edit
                          </button>
                          <button className="admin-btn" onClick={() => remove(s.id)} type="button">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!filtered.length && <div style={{ opacity: 0.75 }}>No stores match.</div>}
              </div>
            )}
          </div>
        </div>

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonContent className="admin-page">
            <div className="admin-container">
              <div className="admin-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 1100, fontSize: 18 }}>{editingId ? "Edit Store" : "Add Store"}</div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="admin-btn" onClick={save} type="button">
                      Save
                    </button>
                    <button className="admin-btn" onClick={() => setShowModal(false)} type="button">
                      Cancel
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                  {!editingId && (
                    <div>
                      <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Store ID</IonLabel>
                      <FieldShell>
                        <IonInput value={sId} placeholder="ex: store_1" onIonInput={(e) => setSId(e.detail.value ?? "")} />
                      </FieldShell>
                    </div>
                  )}

                  <div>
                    <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Name</IonLabel>
                    <FieldShell>
                      <IonInput value={sName} placeholder="Store name" onIonInput={(e) => setSName(e.detail.value ?? "")} />
                    </FieldShell>
                  </div>

                  <div>
                    <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Phone (required)</IonLabel>
                    <FieldShell>
                      <IonInput value={sPhone} placeholder="70xxxxxx" onIonInput={(e) => setSPhone(e.detail.value ?? "")} />
                    </FieldShell>
                  </div>

                  <div style={{ marginTop: 6, fontWeight: 1000 }}>Address (required)</div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Region</IonLabel>
                      <FieldShell>
                        <IonInput value={aRegion} placeholder="Beirut / Mount Lebanon..." onIonInput={(e) => setARegion(e.detail.value ?? "")} />
                      </FieldShell>
                    </div>

                    <div>
                      <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>City</IonLabel>
                      <FieldShell>
                        <IonInput value={aCity} placeholder="Beirut" onIonInput={(e) => setACity(e.detail.value ?? "")} />
                      </FieldShell>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Area</IonLabel>
                      <FieldShell>
                        <IonInput value={aArea} placeholder="Hamra / Jnah / ..." onIonInput={(e) => setAArea(e.detail.value ?? "")} />
                      </FieldShell>
                    </div>

                    <div>
                      <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Street</IonLabel>
                      <FieldShell>
                        <IonInput value={aStreet} placeholder="Main street name" onIonInput={(e) => setAStreet(e.detail.value ?? "")} />
                      </FieldShell>
                    </div>
                  </div>

                  <div style={{ marginTop: 6, fontWeight: 1000 }}>Extra (optional)</div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Building</IonLabel>
                      <FieldShell>
                        <IonInput value={aBuilding} placeholder="Building name" onIonInput={(e) => setABuilding(e.detail.value ?? "")} />
                      </FieldShell>
                    </div>

                    <div>
                      <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Floor</IonLabel>
                      <FieldShell>
                        <IonInput value={aFloor} placeholder="2nd floor" onIonInput={(e) => setAFloor(e.detail.value ?? "")} />
                      </FieldShell>
                    </div>
                  </div>

                  <div>
                    <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Notes</IonLabel>
                    <FieldShell>
                      <IonTextarea
                        autoGrow
                        value={aNotes}
                        placeholder="Landmark / directions..."
                        onIonInput={(e) => setANotes(e.detail.value ?? "")}
                      />
                    </FieldShell>
                  </div>
                </div>
              </div>
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default AdminStores;