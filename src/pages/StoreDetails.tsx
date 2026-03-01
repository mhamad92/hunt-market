import React, { useMemo, useState, useEffect } from "react";
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonAlert,
  IonModal,
  IonInput,
  IonTextarea,
  IonLabel,
} from "@ionic/react";
import { useHistory, useParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";

import { useStore } from "../hooks/useStore";
import { useProducts } from "../hooks/useProducts";
import { useCategories } from "../hooks/useCategories";
import { useIsAdmin } from "../lib/admin";
import { deleteStore, updateStore } from "../data/stores";
import { deleteProduct, upsertProductWithId, updateProduct, type Product } from "../data/products";

type RouteParams = { storeId: string };

const isRestrictedCategory = (categoryId: string) => categoryId === "ammo" || categoryId === "shotguns";
const is18Ok = () => sessionStorage.getItem("hm_18_ok") === "1";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=1200&q=60";

const StoreDetails: React.FC = () => {
  const history = useHistory();
  const { storeId } = useParams<RouteParams>();

  const { loading: storeLoading, store } = useStore(storeId);
  const { loading: productsLoading, products } = useProducts({ storeId });
  const { loading: categoriesLoading, categories } = useCategories();
  const { loading: adminLoading, isAdmin } = useIsAdmin();

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");

  // 18+ gate
  const [show18Alert, setShow18Alert] = useState(false);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);

  // ✅ Admin store modal (NEW fields)
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [sName, setSName] = useState("");
  const [sPhone, setSPhone] = useState("");
  const [sImage, setSImage] = useState("");

  const [aRegion, setARegion] = useState("");
  const [aCity, setACity] = useState("");
  const [aArea, setAArea] = useState("");
  const [aStreet, setAStreet] = useState("");
  const [aBuilding, setABuilding] = useState("");
  const [aFloor, setAFloor] = useState("");
  const [aNotes, setANotes] = useState("");

  // Admin product modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState<string>("0");
  const [pCategoryId, setPCategoryId] = useState("");
  const [pImages, setPImages] = useState(""); // pipe separated
  const [pDesc, setPDesc] = useState("");
  const [pInStock, setPInStock] = useState(true);
  const [pSizes, setPSizes] = useState(""); // pipe separated

  // ✅ map categoryId -> name
  const catName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);

  // categories present in this store (IDs)
  const categoriesInStore = useMemo(() => {
    const set = new Set(products.map((p) => p.categoryId));
    return Array.from(set.values()).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = [...products];

    if (term) list = list.filter((p) => `${p.name} ${p.description ?? ""}`.toLowerCase().includes(term));
    if (category !== "all") list = list.filter((p) => p.categoryId === category);

    return list;
  }, [products, q, category]);

  const openProduct = (productId: string) => history.push(`/product/${productId}`);

  const handleProductClick = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;

    if (isRestrictedCategory(p.categoryId) && !is18Ok()) {
      setPendingProductId(productId);
      setShow18Alert(true);
      return;
    }
    openProduct(productId);
  };

  // ✅ fill store modal fields when opening
  const openEditStore = () => {
    if (!store) return;

    setSName(store.name || "");
    setSPhone(store.phone || "");
    setSImage(store.image || "");

    setARegion(store.address?.region || "");
    setACity(store.address?.city || "");
    setAArea(store.address?.area || "");
    setAStreet(store.address?.street || "");
    setABuilding(store.address?.building || "");
    setAFloor(store.address?.floor || "");
    setANotes(store.address?.notes || "");

    setShowStoreModal(true);
  };

  const saveStore = async () => {
    if (!store) return;

    const name = sName.trim();
    const phone = sPhone.trim();
    const image = sImage.trim();

    const region = aRegion.trim();
    const city = aCity.trim();
    const area = aArea.trim();
    const street = aStreet.trim();
    const building = aBuilding.trim();
    const floor = aFloor.trim();
    const notes = aNotes.trim();

    if (!name) return alert("Store name is required.");
    if (!phone) return alert("Store phone is required.");

    // required address fields (based on your stores.ts)
    if (!region || !city || !area || !street) {
      return alert("Fill address: region, city, area, street (required).");
    }

    try {
      // ✅ IMPORTANT: patch address as a full object (no undefined)
      await updateStore(store.id, {
        name,
        phone,
        image: image ? image : undefined,
        address: {
          region,
          city,
          area,
          street,
          building: building ? building : undefined,
          floor: floor ? floor : undefined,
          notes: notes ? notes : undefined,
        },
      });

      setShowStoreModal(false);
    } catch (e: any) {
      alert(e?.message || "Could not save store");
    }
  };

  const removeStore = async () => {
    if (!store) return;
    if (!confirm("Delete this store? (Products will remain but will be invalid until fixed)")) return;
    try {
      await deleteStore(store.id);
      history.push("/stores");
    } catch (e: any) {
      alert(e?.message || "Could not delete store");
    }
  };

  const openCreateProduct = () => {
    setEditingProductId(null);
    setPName("");
    setPPrice("0");
    setPCategoryId(categories[0]?.id || "");
    setPImages("");
    setPDesc("");
    setPInStock(true);
    setPSizes("");
    setShowProductModal(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setPName(p.name);
    setPPrice(String(p.price));
    setPCategoryId(p.categoryId);
    setPImages((p.images || []).join("|"));
    setPDesc(p.description || "");
    setPInStock(p.inStock !== false);
    setPSizes((p.sizes || []).join("|"));
    setShowProductModal(true);
  };

  const saveProduct = async () => {
    if (!store) return;

    const name = pName.trim();
    const price = Number(pPrice);
    const categoryId = pCategoryId.trim();
    const images = pImages.split("|").map((x) => x.trim()).filter(Boolean);
    const description = pDesc.trim();
    const sizes = pSizes.split("|").map((x) => x.trim()).filter(Boolean);

    if (!name || !categoryId || !images.length || !description || !Number.isFinite(price)) {
      alert("Fill: name, price, category, images, description.");
      return;
    }

    try {
      if (editingProductId) {
        await updateProduct(editingProductId, {
          name,
          price,
          categoryId,
          storeId: store.id,
          images,
          description,
          inStock: pInStock,
          sizes: sizes.length ? sizes : undefined,
        });
      } else {
        const id = `p_${Date.now()}`;
        await upsertProductWithId(id, {
          name,
          price,
          categoryId,
          storeId: store.id,
          images,
          description,
          inStock: pInStock,
          sizes: sizes.length ? sizes : undefined,
        });
      }
      setShowProductModal(false);
    } catch (e: any) {
      alert(e?.message || "Could not save product");
    }
  };

  const removeProduct = async (productId: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct(productId);
    } catch (e: any) {
      alert(e?.message || "Could not delete product");
    }
  };

  if (storeLoading) {
    return (
      <IonPage>
        <AppHeader showBack backHref="/stores" />
        <IonContent className="hm-content hm-camo">
          <div className="hm-wrap" style={{ paddingTop: 18 }}>
            <div className="stores-empty">Loading…</div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!store) {
    return (
      <IonPage>
        <AppHeader showBack backHref="/stores" />
        <IonContent className="hm-content hm-camo">
          <div className="hm-wrap" style={{ paddingTop: 18 }}>
            <div style={{ color: "rgba(238,243,238,0.85)", fontWeight: 1000 }}>Store not found.</div>
            <button className="pd-primary" style={{ marginTop: 12 }} onClick={() => history.push("/stores")} type="button">
              Back to Stores
            </button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const storeBanner = products[0]?.images?.[0] || store.image || FALLBACK_IMG;
  const storeLogo = store.image || FALLBACK_IMG;

  return (
    <IonPage>
      <AppHeader showBack backHref="/stores" />

      <IonHeader translucent>
        <IonToolbar className="hm-toolbar">
          <div className="hm-wrap" style={{ padding: "8px 18px", display: "flex", gap: 10 }}>
            <IonSearchbar
              className="hm-search"
              value={q}
              placeholder="Search this store..."
              onIonInput={(e) => setQ(e.detail.value ?? "")}
            />

            <IonSelect value={category} interface="popover" className="hm-select-ionic" onIonChange={(e) => setCategory(e.detail.value)}>
              <IonSelectOption value="all">All</IonSelectOption>
              {categoriesInStore.map((cid) => (
                <IonSelectOption key={cid} value={cid}>
                  {catName.get(cid) || cid}
                </IonSelectOption>
              ))}
            </IonSelect>

            {!adminLoading && isAdmin && (
              <button className="pd-secondary" onClick={openCreateProduct} type="button">
                + Product
              </button>
            )}
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="hm-content hm-camo">
        <div className="hm-wrap" style={{ paddingTop: 14, paddingBottom: 26 }}>
          {/* Store hero */}
          <div className="sd-hero sd-hero-banner">
            <div className="sd-banner" style={{ backgroundImage: `url(${storeBanner})` }} aria-hidden="true" />
            <div className="sd-hero-inner">
              <div className="sd-logo" style={{ backgroundImage: `url(${storeLogo})` }} aria-hidden="true" />

              <div className="sd-meta">
                <div className="sd-name">{store.name}</div>

                <div className="sd-region">
                  {store.address?.region} • {store.address?.city} • {store.address?.area}
                </div>

                <div className="pd-footnote" style={{ marginTop: 6 }}>
                  {store.address?.street}
                  {store.address?.building ? ` • Bldg ${store.address.building}` : ""}
                  {store.address?.floor ? ` • Floor ${store.address.floor}` : ""}
                  {store.phone ? ` • ${store.phone}` : ""}
                </div>

                <div className="sd-actions">
                  <button className="sd-btn" onClick={() => history.push("/cart")} type="button">
                    View cart
                  </button>
                  <button className="sd-btn ghost" onClick={() => alert("Add WhatsApp / Call / Map next")} type="button">
                    Contact store
                  </button>

                  {!adminLoading && isAdmin && (
                    <>
                      <button className="sd-btn ghost" onClick={openEditStore} type="button">
                        Edit store
                      </button>
                      <button className="sd-btn ghost" onClick={removeStore} type="button">
                        Delete store
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="sd-stats">
                <div className="sd-stat">
                  <div className="sd-stat-num">{products.length}</div>
                  <div className="sd-stat-lbl">Items</div>
                </div>
                <div className="sd-stat">
                  <div className="sd-stat-num">{categoriesInStore.length}</div>
                  <div className="sd-stat-lbl">Categories</div>
                </div>
              </div>
            </div>
          </div>

          {/* Chips */}
          <div className="sd-chips">
            <button className={`sd-chip ${category === "all" ? "active" : ""}`} onClick={() => setCategory("all")} type="button">
              All
            </button>
            {categoriesInStore.map((cid) => (
              <button key={cid} className={`sd-chip ${category === cid ? "active" : ""}`} onClick={() => setCategory(cid)} type="button">
                {catName.get(cid) || cid}
              </button>
            ))}
          </div>

          {/* Products */}
          <div className="sd-row">
            <div className="sd-title">
              Products <span className="sd-count">{filtered.length}</span>
            </div>
          </div>

          {productsLoading && <div className="stores-empty" style={{ marginTop: 12 }}>Loading items…</div>}

          <div className="hm-grid">
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
                    onError={(e) => ((e.currentTarget as HTMLImageElement).src = FALLBACK_IMG)}
                  />
                  <div className="hm-product-img-overlay" />
                </div>

                <div className="hm-product-body">
                  <p className="hm-product-name">{p.name}</p>

                  <div className="sd-bottom">
                    <div className="hm-product-price">${p.price}</div>
                    {(p.categoryId === "ammo" || p.categoryId === "shotguns") && <span className="sd-pill warn">18+</span>}
                  </div>

                  {p.inStock === false && <div className="sd-pill">Out of stock</div>}

                  {!adminLoading && isAdmin && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button className="pd-secondary" onClick={(e) => (e.stopPropagation(), openEditProduct(p))} type="button">
                        Edit
                      </button>
                      <button className="pd-secondary" onClick={(e) => (e.stopPropagation(), removeProduct(p.id))} type="button">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!filtered.length && !productsLoading && (
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

        {/* ✅ Admin Store Modal (UPDATED) */}
        <IonModal isOpen={showStoreModal} onDidDismiss={() => setShowStoreModal(false)}>
          <IonHeader translucent>
            <IonToolbar className="hm-toolbar">
              <div className="hm-wrap" style={{ padding: 14, fontWeight: 900 }}>Edit Store</div>
            </IonToolbar>
          </IonHeader>

          <IonContent className="hm-content hm-camo">
            <div className="hm-wrap" style={{ padding: 16, display: "grid", gap: 12 }}>
              <div>
                <IonLabel>Name</IonLabel>
                <IonInput value={sName} onIonInput={(e) => setSName(e.detail.value ?? "")} />
              </div>

              <div>
                <IonLabel>Phone</IonLabel>
                <IonInput value={sPhone} onIonInput={(e) => setSPhone(e.detail.value ?? "")} />
              </div>

              <div>
                <IonLabel>Image URL (optional)</IonLabel>
                <IonInput value={sImage} onIonInput={(e) => setSImage(e.detail.value ?? "")} />
              </div>

              <div style={{ marginTop: 8, fontWeight: 900, opacity: 0.9 }}>Address</div>

              <div>
                <IonLabel>Region *</IonLabel>
                <IonInput value={aRegion} onIonInput={(e) => setARegion(e.detail.value ?? "")} />
              </div>

              <div>
                <IonLabel>City *</IonLabel>
                <IonInput value={aCity} onIonInput={(e) => setACity(e.detail.value ?? "")} />
              </div>

              <div>
                <IonLabel>Area *</IonLabel>
                <IonInput value={aArea} onIonInput={(e) => setAArea(e.detail.value ?? "")} />
              </div>

              <div>
                <IonLabel>Street *</IonLabel>
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
                <IonTextarea value={aNotes} onIonInput={(e) => setANotes(e.detail.value ?? "")} />
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

        {/* Admin Product Modal */}
        <IonModal isOpen={showProductModal} onDidDismiss={() => setShowProductModal(false)}>
          <IonHeader translucent>
            <IonToolbar className="hm-toolbar">
              <div className="hm-wrap" style={{ padding: 14, fontWeight: 900 }}>
                {editingProductId ? "Edit Product" : "Add Product"}
              </div>
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
                <IonInput inputMode="decimal" value={pPrice} onIonInput={(e) => setPPrice(e.detail.value ?? "0")} />
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
      </IonContent>
    </IonPage>
  );
};

export default StoreDetails;