// src/data/products.ts
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
  where,
  type QueryConstraint,
  type Unsubscribe,
  deleteField,
} from "firebase/firestore";
import { db } from "../firebase";

export type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
  categoryId: string;
  storeId: string;
  description: string;
  inStock?: boolean;
  sizes?: string[];
  createdAt?: any;
  updatedAt?: any;
};

export type ProductCreate = Omit<Product, "id" | "createdAt" | "updatedAt">;

function assertProductInput(input: ProductCreate) {
  if (!input?.name) throw new Error("Product name is required");
  if (typeof input.price !== "number" || Number.isNaN(input.price)) throw new Error("Product price must be a number");
  if (!input.categoryId) throw new Error("categoryId is required");
  if (!input.storeId) throw new Error("storeId is required");
  if (!Array.isArray(input.images) || input.images.length === 0) throw new Error("images[] is required (at least 1)");
  if (!input.description) throw new Error("description is required");
}

/** Create or update product by a specific ID (best for bulk import). Keeps createdAt if doc exists. */
export async function upsertProductWithId(id: string, input: ProductCreate) {
  if (!id) throw new Error("Product id is required");
  assertProductInput(input);

  const ref = doc(db, "products", id);
  const snap = await getDoc(ref);

  // ✅ build clean payload (no undefined)
  const data: any = {
    name: input.name,
    price: input.price,
    images: input.images,
    categoryId: input.categoryId,
    storeId: input.storeId,
    description: input.description,
    inStock: input.inStock ?? true,
    createdAt: snap.exists() ? (snap.data() as any).createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // ✅ only include sizes if present & not empty
  if (Array.isArray(input.sizes) && input.sizes.length > 0) {
    data.sizes = input.sizes;
  }

  await setDoc(ref, data, { merge: true });
  return id;
}

/** Update product fields (patch). Does not force required fields. */
export async function updateProduct(productId: string, patch: Partial<ProductCreate>) {
  if (!productId) throw new Error("productId is required");

  if (patch.price !== undefined) {
    if (typeof patch.price !== "number" || Number.isNaN(patch.price)) throw new Error("price must be a number");
  }
  if (patch.images !== undefined) {
    if (!Array.isArray(patch.images) || patch.images.length === 0) throw new Error("images[] must have at least 1 image");
  }

  const next: any = { ...patch, updatedAt: serverTimestamp() };

  // ✅ handle sizes safely:
  // - if patch.sizes is undefined => don't touch sizes
  // - if patch.sizes is [] => delete sizes field
  // - if patch.sizes has values => set it
  if (patch.sizes !== undefined) {
    if (Array.isArray(patch.sizes) && patch.sizes.length > 0) next.sizes = patch.sizes;
    else next.sizes = deleteField();
  }

  await updateDoc(doc(db, "products", productId), next);
}

/** Delete product. */
export async function deleteProduct(productId: string) {
  if (!productId) throw new Error("productId is required");
  await deleteDoc(doc(db, "products", productId));
}

/** Get one product. */
export async function getProduct(productId: string): Promise<Product | null> {
  if (!productId) return null;
  const snap = await getDoc(doc(db, "products", productId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Product, "id">) };
}

/** Live subscribe to products list with optional filters. */
export function subscribeProducts(
  cb: (products: Product[]) => void,
  opts?: { storeId?: string; categoryId?: string }
): Unsubscribe {
  const constraints: QueryConstraint[] = [orderBy("name", "asc")];

  if (opts?.storeId) constraints.unshift(where("storeId", "==", opts.storeId));
  if (opts?.categoryId) constraints.unshift(where("categoryId", "==", opts.categoryId));

  const qy = query(collection(db, "products"), ...constraints);

  return onSnapshot(qy, (snap) => {
    cb(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Product, "id">),
      }))
    );
  });
}