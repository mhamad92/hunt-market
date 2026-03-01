import React, { useMemo, useState } from "react";
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle } from "@ionic/react";
import AppHeader from "../components/AppHeader";
import { useIsAdmin } from "../lib/admin";
import { upsertStoreWithId } from "../data/stores";
import { upsertProductWithId } from "../data/products";
import { upsertCategoryWithId } from "../data/categories";

// ✅ Categories unchanged
type CategoryRow = { id: string; name: string; order?: number; image?: string };

// ✅ Stores updated to match your NEW schema in src/data/stores.ts
// CSV header will be:
// id,name,phone,region,city,area,street,building,floor,notes,image
type StoreRow = {
  id: string;
  name: string;
  phone: string;
  region: string;
  city: string;
  area: string;
  street: string;
  building?: string;
  floor?: string;
  notes?: string;
  image?: string;
};

// ✅ Products unchanged (still requires images[] at least 1 — your products.ts enforces it)
type ProductRow = {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  storeId: string;
  images: string[];
  description: string;
  inStock: boolean;
  sizes?: string[];
};

function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && next === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(cur);
      cur = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((c) => c.trim().length > 0)) rows.push(row);
      row = [];
      continue;
    }
    cur += ch;
  }

  row.push(cur);
  if (row.some((c) => c.trim().length > 0)) rows.push(row);

  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => (obj[h] = (r[idx] ?? "").trim()));
    return obj;
  });
}

function splitPipe(v: string) {
  return (v ?? "")
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
}

const AdminImport: React.FC = () => {
  const { loading, isAdmin } = useIsAdmin();

  const [categoriesFile, setCategoriesFile] = useState<File | null>(null);
  const [storesFile, setStoresFile] = useState<File | null>(null);
  const [productsFile, setProductsFile] = useState<File | null>(null);

  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const canUse = useMemo(() => !loading && isAdmin, [loading, isAdmin]);

  const readFile = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsText(f);
    });

  const importAll = async () => {
    if (!canUse) return;
    if (!categoriesFile && !storesFile && !productsFile) {
      setLog((p) => [...p, "❌ Select at least one CSV file."]);
      return;
    }

    setBusy(true);
    setLog(["Starting import..."]);

    try {
      // 1) CATEGORIES
      if (categoriesFile) {
        const text = await readFile(categoriesFile);
        const rows = parseCSV(text);

        let ok = 0;
        for (const r of rows) {
          const c: CategoryRow = {
            id: r.id,
            name: r.name,
            order: r.order ? Number(r.order) : undefined,
            image: r.image || undefined,
          };

          if (!c.id || !c.name) {
            setLog((p) => [...p, `⚠️ Skipped category (missing fields): ${JSON.stringify(r)}`]);
            continue;
          }

          await upsertCategoryWithId(c.id, {
            name: c.name,
            order: Number.isFinite(c.order as any) ? c.order : undefined,
            image: c.image,
          });

          ok++;
        }

        setLog((p) => [...p, `✅ Categories imported/updated: ${ok}`]);
      }

      // 2) STORES (UPDATED)
      if (storesFile) {
        const text = await readFile(storesFile);
        const rows = parseCSV(text);

        let ok = 0;
        for (const r of rows) {
          const s: StoreRow = {
            id: r.id,
            name: r.name,
            phone: r.phone,
            region: r.region,
            city: r.city,
            area: r.area,
            street: r.street,
            building: r.building || undefined,
            floor: r.floor || undefined,
            notes: r.notes || undefined,
            image: r.image || undefined,
          };

          // ✅ required fields for your new stores.ts validation
          if (!s.id || !s.name || !s.phone || !s.region || !s.city || !s.area || !s.street) {
            setLog((p) => [...p, `⚠️ Skipped store (missing fields): ${JSON.stringify(r)}`]);
            continue;
          }

          await upsertStoreWithId(s.id, {
            name: s.name,
            phone: s.phone,
            address: {
              region: s.region,
              city: s.city,
              area: s.area,
              street: s.street,
              building: s.building,
              floor: s.floor,
              notes: s.notes,
            },
            image: s.image,
          });

          ok++;
        }

        setLog((p) => [...p, `✅ Stores imported/updated: ${ok}`]);
      }

      // 3) PRODUCTS
      if (productsFile) {
        const text = await readFile(productsFile);
        const rows = parseCSV(text);

        let ok = 0;
        for (const r of rows) {
          const price = Number(r.price);
          const inStock = String(r.inStock).toLowerCase() !== "false";

          const pRow: ProductRow = {
            id: r.id,
            name: r.name,
            price: Number.isFinite(price) ? price : 0,
            categoryId: r.categoryId,
            storeId: r.storeId,
            images: splitPipe(r.images || ""),
            description: r.description || "",
            inStock,
            sizes: r.sizes ? splitPipe(r.sizes) : undefined,
          };

          if (!pRow.id || !pRow.name || !pRow.categoryId || !pRow.storeId || pRow.images.length === 0) {
            setLog((p) => [...p, `⚠️ Skipped product (missing fields): ${JSON.stringify(r)}`]);
            continue;
          }

          await upsertProductWithId(pRow.id, {
            name: pRow.name,
            price: pRow.price,
            categoryId: pRow.categoryId,
            storeId: pRow.storeId,
            images: pRow.images,
            description: pRow.description,
            inStock: pRow.inStock,
            sizes: pRow.sizes && pRow.sizes.length ? pRow.sizes : undefined,
          });

          ok++;
        }

        setLog((p) => [...p, `✅ Products imported/updated: ${ok}`]);
      }

      setLog((p) => [...p, "🎉 Done."]);
    } catch (e: any) {
      console.error(e);
      setLog((p) => [...p, `❌ Error: ${e?.message || String(e)}`]);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <AppHeader showBack backHref="/home" />
        <IonContent className="hm-content hm-camo">
          <div className="hm-wrap" style={{ paddingTop: 18 }}>
            <div className="stores-empty">Loading…</div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!isAdmin) {
    return (
      <IonPage>
        <AppHeader showBack backHref="/home" />
        <IonContent className="hm-content hm-camo">
          <div className="hm-wrap" style={{ paddingTop: 18 }}>
            <div className="stores-empty">Admins only.</div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar className="hm-toolbar">
          <IonTitle>Admin Import</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="hm-content hm-camo">
        <div className="hm-wrap" style={{ padding: 18, display: "grid", gap: 14 }}>
          <div className="stores-title">Bulk Import (CSV)</div>

          <div className="pd-card" style={{ padding: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>1) Categories CSV</div>
            <input type="file" accept=".csv" onChange={(e) => setCategoriesFile(e.target.files?.[0] || null)} />
            <div style={{ opacity: 0.8, marginTop: 8, fontSize: 13 }}>
              Header: <code>id,name,order,image</code>
            </div>
          </div>

          <div className="pd-card" style={{ padding: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>2) Stores CSV</div>
            <input type="file" accept=".csv" onChange={(e) => setStoresFile(e.target.files?.[0] || null)} />
            <div style={{ opacity: 0.8, marginTop: 8, fontSize: 13 }}>
              Header:{" "}
              <code>id,name,phone,region,city,area,street,building,floor,notes,image</code>
            </div>
          </div>

          <div className="pd-card" style={{ padding: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>3) Products CSV</div>
            <input type="file" accept=".csv" onChange={(e) => setProductsFile(e.target.files?.[0] || null)} />
            <div style={{ opacity: 0.8, marginTop: 8, fontSize: 13 }}>
              Header: <code>id,name,price,categoryId,storeId,images,description,inStock,sizes</code>
              <div style={{ marginTop: 6 }}>
                Use <code>|</code> to separate multiple images/sizes.
              </div>
            </div>
          </div>

          <button className="pd-primary" disabled={busy} onClick={importAll} type="button">
            {busy ? "Importing…" : "Start Import"}
          </button>

          <div className="pd-card" style={{ padding: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Log</div>
            <div style={{ whiteSpace: "pre-wrap", fontFamily: "ui-monospace, SFMono-Regular", fontSize: 12 }}>
              {log.join("\n")}
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminImport;