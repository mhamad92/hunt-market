// src/hooks/useProduct.ts
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { Product } from "../data/products";

type ProductDoc = Omit<Product, "id">;

export function useProduct(productId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const ref = doc(db, "products", productId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setProduct(null);
          setLoading(false);
          return;
        }
        const data = snap.data() as ProductDoc;
        setProduct({ id: snap.id, ...data });
        setLoading(false);
      },
      () => {
        setProduct(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [productId]);

  return { loading, product };
}