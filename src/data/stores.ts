// src/data/stores.ts
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";

/** ✅ New address object (not string) */
export type StoreAddress = {
  region: string;
  city: string;
  area: string;
  street: string;
  building?: string;
  floor?: string;
  notes?: string;
};

export type Store = {
  id: string;
  name: string;
  phone: string; // ✅ required
  address: StoreAddress; // ✅ required (object)
  image?: string; // optional store cover/logo image url
  createdAt?: any;
  updatedAt?: any;
};

/** Payload used for create/update (id comes from doc id) */
export type StoreCreate = Omit<Store, "id" | "createdAt" | "updatedAt">;

/**
 * Create or update a store using a specific ID (best for admin/manual IDs).
 * Keeps createdAt if doc exists.
 */
export async function upsertStoreWithId(id: string, input: StoreCreate) {
  if (!id) throw new Error("Store id is required");
  if (!input?.name?.trim()) throw new Error("Store name is required");
  if (!input?.phone?.trim()) throw new Error("Store phone is required");

  const a = input?.address;
  if (!a) throw new Error("Store address is required");
  if (!a.region?.trim()) throw new Error("Store region is required");
  if (!a.city?.trim()) throw new Error("Store city is required");
  if (!a.area?.trim()) throw new Error("Store area is required");
  if (!a.street?.trim()) throw new Error("Store street is required");

  const ref = doc(db, "stores", id);
  const snap = await getDoc(ref);

  // ✅ Build clean payload (NO undefined)
  const address: any = {
    region: a.region.trim(),
    city: a.city.trim(),
    area: a.area.trim(),
    street: a.street.trim(),
  };
  if (a.building?.trim()) address.building = a.building.trim();
  if (a.floor?.trim()) address.floor = a.floor.trim();
  if (a.notes?.trim()) address.notes = a.notes.trim();

  const data: any = {
    name: input.name.trim(),
    phone: input.phone.trim(),
    address,
    createdAt: snap.exists() ? (snap.data() as any).createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (input.image?.trim()) data.image = input.image.trim();

  await setDoc(ref, data, { merge: true });

  return id;
}

/**
 * Update store fields (patch).
 * NOTE: if you patch address, send the full address object (recommended).
 */
export async function updateStore(storeId: string, patch: Partial<StoreCreate>) {
  if (!storeId) throw new Error("storeId is required");

  const next: any = { ...patch, updatedAt: serverTimestamp() };

  // normalize string fields
  if (typeof next.name === "string") next.name = next.name.trim();
  if (typeof next.phone === "string") next.phone = next.phone.trim();
  if (typeof next.image === "string") next.image = next.image.trim();

  // normalize address if provided
  if (next.address) {
    const a = next.address as StoreAddress;
    next.address = {
      region: String(a.region || "").trim(),
      city: String(a.city || "").trim(),
      area: String(a.area || "").trim(),
      street: String(a.street || "").trim(),
      building: a.building ? String(a.building).trim() : undefined,
      floor: a.floor ? String(a.floor).trim() : undefined,
      notes: a.notes ? String(a.notes).trim() : undefined,
    };
  }

  await updateDoc(doc(db, "stores", storeId), next);
}

/** Delete a store document */
export async function deleteStore(storeId: string) {
  if (!storeId) throw new Error("storeId is required");
  await deleteDoc(doc(db, "stores", storeId));
}

/** Get one store */
export async function getStore(storeId: string): Promise<Store | null> {
  if (!storeId) return null;
  const snap = await getDoc(doc(db, "stores", storeId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Store;
}

/** Live subscribe to stores list */
export function subscribeStores(cb: (stores: Store[]) => void): Unsubscribe {
  const qy = query(collection(db, "stores"), orderBy("name", "asc"));
  return onSnapshot(qy, (snap) => {
    cb(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Store[]
    );
  });
}