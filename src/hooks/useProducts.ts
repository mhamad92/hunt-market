// src/hooks/useProducts.ts
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where, type QueryConstraint } from "firebase/firestore";
import { db } from "../firebase";
import type { Product } from "../data/products";

type ProductDoc = Omit<Product, "id">;

export function useProducts(opts?: { storeId?: string; categoryId?: string }) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setLoading(true);

    const constraints: QueryConstraint[] = [orderBy("name", "asc")];
    if (opts?.storeId) constraints.unshift(where("storeId", "==", opts.storeId));
    if (opts?.categoryId) constraints.unshift(where("categoryId", "==", opts.categoryId));

    const qy = query(collection(db, "products"), ...constraints);

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() as ProductDoc;
          return { id: d.id, ...data };
        });
        setProducts(list);
        setLoading(false);
      },
      () => {
        setProducts([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [opts?.storeId, opts?.categoryId]);

  return { loading, products };
}