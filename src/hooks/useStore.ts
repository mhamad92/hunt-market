import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { Store } from "../data/stores";

type StoreDoc = Omit<Store, "id">;

export function useStore(storeId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    if (!storeId) {
      setStore(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const ref = doc(db, "stores", storeId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setStore(null);
          setLoading(false);
          return;
        }
        setStore({ id: snap.id, ...(snap.data() as StoreDoc) });
        setLoading(false);
      },
      () => {
        setStore(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [storeId]);

  return { loading, store };
}