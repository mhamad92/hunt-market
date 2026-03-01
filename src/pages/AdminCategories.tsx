import React, { useMemo, useState } from "react";
import { IonPage, IonContent, IonModal, IonInput, IonLabel } from "@ionic/react";
import { useIsAdmin } from "../lib/admin";
import { useCategories } from "../hooks/useCategories";
import { deleteCategory, upsertCategoryWithId, updateCategory, type Category } from "../data/categories";

const FieldShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ background: "#fff", borderRadius: 12, padding: 10, border: "1px solid rgba(0,0,0,0.10)" }}>
    {children}
  </div>
);

const AdminCategories: React.FC = () => {
  const { loading: adminLoading, isAdmin } = useIsAdmin();
  const { categories, loading } = useCategories() as any;

  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [cName, setCName] = useState("");
  const [cId, setCId] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((c: any) => `${c.id} ${c.name}`.toLowerCase().includes(term));
  }, [categories, q]);

  const openCreate = () => {
    setEditingId(null);
    setCName("");
    setCId("");
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setCId(c.id);
    setCName(c.name);
    setShowModal(true);
  };

  const save = async () => {
    const name = cName.trim();
    const id = (editingId ? editingId : cId.trim()).toLowerCase();

    if (!name || !id) return alert("Fill: ID and Name");
    // very important: firestore ids shouldn't have spaces
    if (/\s/.test(id)) return alert("Category ID must not contain spaces.");

    try {
      if (editingId) {
        await updateCategory(editingId, { name });
      } else {
        await upsertCategoryWithId(id, { name });
      }
      setShowModal(false);
    } catch (e: any) {
      alert(e?.message || "Could not save category");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      await deleteCategory(id);
    } catch (e: any) {
      alert(e?.message || "Could not delete category");
    }
  };

  return (
    <IonPage>
      <IonContent className="admin-page">
        <div className="admin-container">
          <div className="admin-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 1000, fontSize: 18 }}>Categories</div>
                <div style={{ opacity: 0.75, marginTop: 4 }}>{filtered.length} total</div>
              </div>

              {!adminLoading && isAdmin && (
                <button className="admin-btn" onClick={openCreate} type="button">
                  + Add Category
                </button>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <FieldShell>
                <IonInput value={q} placeholder="Search categories..." onIonChange={(e) => setQ(e.detail.value ?? "")} />
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
                {filtered.map((c: any) => (
                  <div key={c.id} className="admin-card" style={{ background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 1000 }}>{c.name}</div>
                        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>ID: {c.id}</div>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button className="admin-btn" onClick={() => openEdit(c)} type="button">
                          Edit
                        </button>
                        <button className="admin-btn" onClick={() => remove(c.id)} type="button">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {!filtered.length && <div style={{ opacity: 0.75 }}>No categories match.</div>}
              </div>
            )}
          </div>
        </div>

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonContent className="admin-page">
            <div className="admin-container">
              <div className="admin-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 1100, fontSize: 18 }}>{editingId ? "Edit Category" : "Add Category"}</div>

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
                      <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Category ID</IonLabel>
                      <FieldShell>
                        <IonInput value={cId} placeholder="ex: optics" onIonChange={(e) => setCId(e.detail.value ?? "")} />
                      </FieldShell>
                    </div>
                  )}

                  <div>
                    <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Name</IonLabel>
                    <FieldShell>
                      <IonInput value={cName} placeholder="Optics" onIonChange={(e) => setCName(e.detail.value ?? "")} />
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

export default AdminCategories;