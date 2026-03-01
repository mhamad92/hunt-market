import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import type { Store } from "../data/stores";

type StoreDoc = Omit<Store, "id">;

export function useStores() {
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const qy = query(collection(db, "stores"), orderBy("name", "asc"));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as StoreDoc) }));
        setStores(list);
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("useStores snapshot error:", err);
        setStores([]);
        setLoading(false);
        setError(err?.message || "Failed to load stores");
      }
    );

    return () => unsub();
  }, []);

  return { loading, stores, error };
}