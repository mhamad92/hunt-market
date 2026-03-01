// src/pages/AdminProducts.tsx
import React, { useMemo, useState } from "react";
import {
  IonPage,
  IonContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonModal,
  IonInput,
  IonTextarea,
  IonLabel,
  IonSpinner,
} from "@ionic/react";

import { useIsAdmin } from "../lib/admin";
import { useStores } from "../hooks/useStores";
import { useCategories } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts";
import { deleteProduct, upsertProductWithId, updateProduct, type Product } from "../data/products";
import type { Store } from "../data/stores";
import type { Category } from "../data/categories";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=1200&q=60";

/** Wrapper to keep Ionic inputs readable */
const FieldShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 12,
      padding: 10,
      border: "1px solid rgba(0,0,0,0.10)",
    }}
  >
    {children}
  </div>
);

function makeId() {
  return `p_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** Bulk parsing */
function parseCsvOrJson(opts: { text: string; mode: "csv" | "json" }) {
  const text = (opts.text || "").trim();
  if (!text) return [];

  if (opts.mode === "json") {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) throw new Error("JSON must be an array of products.");
    return arr;
  }

  // CSV header required:
  // id,name,price,storeId,categoryId,images,description,inStock,sizes
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) throw new Error("CSV needs header + at least 1 row.");

  const header = lines[0].split(",").map((h) => h.trim());
  const idx = (key: string) => header.indexOf(key);

  const rows = lines.slice(1).map((line) => {
    // Simple CSV split (no commas inside values)
    const cols = line.split(",").map((c) => c.trim());
    const get = (key: string) => {
      const i = idx(key);
      return i >= 0 ? (cols[i] ?? "") : "";
    };

    const images = (get("images") || "")
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);

    const sizes = (get("sizes") || "")
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);

    return {
      id: get("id") || makeId(),
      name: get("name"),
      price: Number(get("price")),
      storeId: get("storeId"),
      categoryId: get("categoryId"),
      images,
      description: get("description") || "",
      inStock: (get("inStock") || "true").toLowerCase() !== "false",
      sizes,
    };
  });

  return rows;
}

const AdminProducts: React.FC = () => {
  const { loading: adminLoading, isAdmin } = useIsAdmin();
  const { stores, loading: storesLoading } = useStores() as any;
  const { categories, loading: categoriesLoading } = useCategories() as any;
  const { products, loading: productsLoading } = useProducts();

  const [q, setQ] = useState("");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [catFilter, setCatFilter] = useState<string>("all");

  // Add/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Bulk modal state
  const [showBulk, setShowBulk] = useState(false);
  const [bulkMode, setBulkMode] = useState<"csv" | "json">("csv");
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  // Form
  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState<string>("0");
  const [pCategoryId, setPCategoryId] = useState("");
  const [pStoreId, setPStoreId] = useState("");
  const [pImages, setPImages] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pInStock, setPInStock] = useState(true);
  const [pSizes, setPSizes] = useState("");

  const storesMap = useMemo<Map<string, Store>>(
  () => new Map(stores.map((s: Store) => [s.id, s])),
  [stores]
);

const categoriesMap = useMemo<Map<string, Category>>(
  () => new Map(categories.map((c: Category) => [c.id, c])),
  [categories]
);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = [...products];

    if (term) {
      list = list.filter((p) =>
        `${p.name} ${p.description ?? ""}`.toLowerCase().includes(term)
      );
    }
    if (storeFilter !== "all") list = list.filter((p) => p.storeId === storeFilter);
    if (catFilter !== "all") list = list.filter((p) => p.categoryId === catFilter);

    return list;
  }, [products, q, storeFilter, catFilter]);

  const openCreate = () => {
    setEditingId(null);
    setPName("");
    setPPrice("0");
    setPCategoryId(categories?.[0]?.id || "");
    setPStoreId(stores?.[0]?.id || "");
    setPImages("");
    setPDesc("");
    setPInStock(true);
    setPSizes("");
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setPName(p.name);
    setPPrice(String(p.price));
    setPCategoryId(p.categoryId);
    setPStoreId(p.storeId);
    setPImages((p.images || []).join(" | "));
    setPDesc(p.description || "");
    setPInStock(p.inStock !== false);
    setPSizes((p.sizes || []).join(" | "));
    setShowModal(true);
  };

  const save = async () => {
    const name = pName.trim();
    const price = Number(pPrice);
    const categoryId = pCategoryId.trim();
    const storeId = pStoreId.trim();
    const images = pImages
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);
    const description = pDesc.trim();
    const sizes = pSizes
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);

    if (!name || !storeId || !categoryId || !images.length || !description || !Number.isFinite(price)) {
      alert("Fill: name, price, store, category, images, description.");
      return;
    }

    try {
      if (editingId) {
        await updateProduct(editingId, {
          name,
          price,
          storeId,
          categoryId,
          images,
          description,
          inStock: pInStock,
          sizes: sizes.length ? sizes : undefined,
        });
      } else {
        await upsertProductWithId(makeId(), {
          name,
          price,
          storeId,
          categoryId,
          images,
          description,
          inStock: pInStock,
          sizes: sizes.length ? sizes : undefined,
        });
      }
      setShowModal(false);
    } catch (e: any) {
      alert(e?.message || "Could not save product");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
    } catch (e: any) {
      alert(e?.message || "Could not delete product");
    }
  };

  const runBulkUpload = async () => {
    try {
      setBulkBusy(true);
      const items = parseCsvOrJson({ text: bulkText, mode: bulkMode });

      if (!items.length) {
        alert("Paste some data first.");
        return;
      }

      for (const p of items) {
        const id = String(p.id || makeId());
        const name = String(p.name || "").trim();
        const price = Number(p.price);
        const storeId = String(p.storeId || "").trim();
        const categoryId = String(p.categoryId || "").trim();
        const images = Array.isArray(p.images) ? p.images : [];
        const description = String(p.description || "").trim();
        const inStock = p.inStock !== false;
        const sizes = Array.isArray(p.sizes) ? p.sizes : [];

        if (!name || !Number.isFinite(price) || !storeId || !categoryId || !images.length || !description) {
          throw new Error(`Invalid row: ${JSON.stringify(p)}`);
        }

        await upsertProductWithId(id, {
          name,
          price,
          storeId,
          categoryId,
          images,
          description,
          inStock,
          sizes: sizes.length ? sizes : undefined,
        });
      }

      alert(`Uploaded ${items.length} products ✅`);
      setShowBulk(false);
      setBulkText("");
    } catch (e: any) {
      alert(e?.message || "Bulk upload failed.");
    } finally {
      setBulkBusy(false);
    }
  };

  const pageBusy = adminLoading || storesLoading || categoriesLoading;

  return (
    <IonPage>
      <IonContent className="admin-page">
        <div className="admin-container">
          {/* Top Controls */}
          <div className="admin-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 1000, fontSize: 18 }}>Products</div>
                <div style={{ opacity: 0.75, marginTop: 4 }}>
                  Search, filter, add, edit, delete. ({filtered.length})
                </div>
              </div>

              {!adminLoading && isAdmin ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="admin-btn" onClick={() => setShowBulk(true)} type="button">
                    Bulk Upload
                  </button>
                  <button className="admin-btn" onClick={openCreate} type="button">
                    + Add Product
                  </button>
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 220px 220px", gap: 10 }}>
              <div style={{ minWidth: 240 }}>
                <FieldShell>
                  <IonSearchbar value={q} placeholder="Search products..." onIonInput={(e) => setQ(e.detail.value ?? "")} />
                </FieldShell>
              </div>

              <FieldShell>
                <IonLabel className="admin-label" style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>
  Store
</IonLabel>
                <IonSelect value={storeFilter} interface="popover" onIonChange={(e) => setStoreFilter(e.detail.value)}>
                  <IonSelectOption value="all">All Stores</IonSelectOption>
                  {stores.map((s: any) => (
                    <IonSelectOption key={s.id} value={s.id}>
                      {s.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </FieldShell>

              <FieldShell>
                <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Category</IonLabel>
                <IonSelect value={catFilter} interface="popover" onIonChange={(e) => setCatFilter(e.detail.value)}>
                  <IonSelectOption value="all">All Categories</IonSelectOption>
                  {categories.map((c: any) => (
                    <IonSelectOption key={c.id} value={c.id}>
                      {c.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </FieldShell>
            </div>

            {pageBusy && (
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, opacity: 0.8 }}>
                <IonSpinner name="dots" />
                Loading admin / stores / categories…
              </div>
            )}

            {!adminLoading && !isAdmin && (
              <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: "#fff3cd", color: "#7a5b00" }}>
                No access. You must be an admin.
              </div>
            )}
          </div>

          {/* Products Grid */}
          {!adminLoading && isAdmin && (
            <div style={{ marginTop: 14 }}>
              {productsLoading ? (
                <div className="admin-card" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <IonSpinner name="dots" />
                  Loading products…
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                    {filtered.map((p) => {
                      const store = storesMap.get(p.storeId);
                      const cat = categoriesMap.get(p.categoryId);

                      return (
                        <div key={p.id} className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
                          <div style={{ height: 160, background: "#eee" }}>
                            <img
                              src={p.images?.[0] || FALLBACK_IMG}
                              alt={p.name}
                              loading="lazy"
                              onError={(e) => ((e.currentTarget as HTMLImageElement).src = FALLBACK_IMG)}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>

                          <div style={{ padding: 14 }}>
                            <div style={{ fontWeight: 1000, fontSize: 16, lineHeight: 1.2 }}>{p.name}</div>
                            <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", gap: 10 }}>
                              <div style={{ fontWeight: 1000 }}>${Number(p.price).toFixed(2)}</div>
                              <span style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>
                                {p.inStock === false ? "OUT" : "IN STOCK"}
                              </span>
                            </div>

                            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                              Store: <b>{store?.name || p.storeId}</b> • Category: <b>{cat?.name || p.categoryId}</b>
                            </div>

                            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                              <button className="admin-btn" onClick={() => openEdit(p)} type="button">
                                Edit
                              </button>
                              <button className="admin-btn" onClick={() => remove(p.id)} type="button">
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!filtered.length && (
                    <div className="admin-card" style={{ marginTop: 12, opacity: 0.75 }}>
                      No products match.
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Add/Edit Modal */}
          <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
            <IonContent className="admin-page">
              <div className="admin-container">
                <div className="admin-card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 1100, fontSize: 18 }}>{editingId ? "Edit Product" : "Add Product"}</div>
                      <div style={{ opacity: 0.75, marginTop: 4 }}>
                        Use <b>|</b> to separate multiple images/sizes.
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button className="admin-btn" onClick={save} type="button">
                        Save
                      </button>
                      <button className="admin-btn" onClick={() => setShowModal(false)} type="button">
                        Cancel
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                    <div>
                      <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Name</IonLabel>
                      <FieldShell>
                        <IonInput value={pName} onIonInput={(e) => setPName(e.detail.value ?? "")} />
                      </FieldShell>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Price</IonLabel>
                        <FieldShell>
                          <IonInput inputMode="decimal" value={pPrice} onIonInput={(e) => setPPrice(e.detail.value ?? "0")} />
                        </FieldShell>
                      </div>

                      <div style={{ display: "flex", alignItems: "end" }}>
                        <button
                          className="admin-btn"
                          type="button"
                          onClick={() => setPInStock((v) => !v)}
                          style={{ width: "100%", background: pInStock ? "#111" : "#666" }}
                        >
                          {pInStock ? "In stock" : "Out of stock"}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <IonLabel className="admin-label" style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>
  Store
</IonLabel>
                        <FieldShell>
                          <IonSelect value={pStoreId} interface="popover" onIonChange={(e) => setPStoreId(e.detail.value)} disabled={stores.length === 0}>
                            {stores.map((s: any) => (
                              <IonSelectOption key={s.id} value={s.id}>
                                {s.name}
                              </IonSelectOption>
                            ))}
                          </IonSelect>
                        </FieldShell>
                      </div>

                      <div>
                        <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Category</IonLabel>
                        <FieldShell>
                          <IonSelect value={pCategoryId} interface="popover" onIonChange={(e) => setPCategoryId(e.detail.value)} disabled={categories.length === 0}>
                            {categories.map((c: any) => (
                              <IonSelectOption key={c.id} value={c.id}>
                                {c.name}
                              </IonSelectOption>
                            ))}
                          </IonSelect>
                        </FieldShell>
                      </div>
                    </div>

                    <div>
                      <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Images (use |)</IonLabel>
                      <FieldShell>
                        <IonInput value={pImages} onIonInput={(e) => setPImages(e.detail.value ?? "")} />
                      </FieldShell>
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>Example: <b>url1 | url2 | url3</b></div>
                    </div>

                    <div>
                      <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Description</IonLabel>
                      <FieldShell>
                        <IonTextarea autoGrow value={pDesc} onIonInput={(e) => setPDesc(e.detail.value ?? "")} />
                      </FieldShell>
                    </div>

                    <div>
                      <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Sizes (optional, use |)</IonLabel>
                      <FieldShell>
                        <IonInput value={pSizes} onIonInput={(e) => setPSizes(e.detail.value ?? "")} />
                      </FieldShell>
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>Example: <b>S | M | L | XL</b></div>
                    </div>
                  </div>
                </div>
              </div>
            </IonContent>
          </IonModal>

          {/* Bulk Upload Modal */}
          <IonModal isOpen={showBulk} onDidDismiss={() => setShowBulk(false)}>
            <IonContent className="admin-page">
              <div className="admin-container">
                <div className="admin-card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 1100, fontSize: 18 }}>Bulk Upload</div>
                      <div style={{ opacity: 0.75, marginTop: 4 }}>
                        Paste CSV or JSON. Images & sizes use <b>|</b>.
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button className="admin-btn" onClick={runBulkUpload} type="button" disabled={bulkBusy}>
                        {bulkBusy ? "Uploading..." : "Upload"}
                      </button>
                      <button className="admin-btn" onClick={() => setShowBulk(false)} type="button" disabled={bulkBusy}>
                        Close
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                    <FieldShell>
                      <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Mode</IonLabel>
                      <IonSelect value={bulkMode} interface="popover" onIonChange={(e) => setBulkMode(e.detail.value)}>
                        <IonSelectOption value="csv">CSV</IonSelectOption>
                        <IonSelectOption value="json">JSON</IonSelectOption>
                      </IonSelect>
                    </FieldShell>

                    <FieldShell>
                      <IonLabel style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Data</IonLabel>
                      <IonTextarea
                        autoGrow
                        value={bulkText}
                        onIonInput={(e) => setBulkText(e.detail.value ?? "")}
                        placeholder={
                          bulkMode === "csv"
                            ? "id,name,price,storeId,categoryId,images,description,inStock,sizes\np1,Cap,10,store1,clothing,https://...|https://...,Nice cap,true,S|M|L"
                            : '[{"id":"p1","name":"Cap","price":10,"storeId":"store1","categoryId":"clothing","images":["https://..."],"description":"Nice cap","inStock":true,"sizes":["S","M"]}]'
                        }
                      />
                    </FieldShell>

                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      ✅ CSV header required: <b>id,name,price,storeId,categoryId,images,description,inStock,sizes</b>
                      <br />
                      ✅ If you leave <b>id</b> empty, we generate one automatically.
                      <br />
                      ⚠️ CSV parser is simple (don’t put commas inside fields).
                    </div>
                  </div>
                </div>
              </div>
            </IonContent>
          </IonModal>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminProducts;