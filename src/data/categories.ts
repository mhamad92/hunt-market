import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export type Category = {
  id: string;
  name: string;
  order?: number;
  image?: string;
};

export type CategoryCreate = Omit<Category, "id">;

export async function upsertCategoryWithId(id: string, input: CategoryCreate) {
  const ref = doc(db, "categories", id);
  const snap = await getDoc(ref);

  await setDoc(
    ref,
    {
      ...input,
      createdAt: snap.exists() ? (snap.data() as any).createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return id;
}

export async function updateCategory(categoryId: string, patch: Partial<CategoryCreate>) {
  await updateDoc(doc(db, "categories", categoryId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCategory(categoryId: string) {
  await deleteDoc(doc(db, "categories", categoryId));
}