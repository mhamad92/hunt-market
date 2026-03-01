// src/hooks/useCategories.ts
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import type { Category } from "../data/categories";

type CategoryDoc = Omit<Category, "id">;

export function useCategories() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    setLoading(true);

    const qy = query(collection(db, "categories"), orderBy("name", "asc"));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() as CategoryDoc;
          return { id: d.id, ...data };
        });
        setCategories(list);
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("useCategories snapshot error:", err);
        setCategories([]);
        setLoading(false);
        setError(err?.message || "Failed to load categories");
      }
    );

    return () => unsub();
  }, []);

  return { loading, categories, error };
}