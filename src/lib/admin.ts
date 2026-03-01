import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

export function useIsAdmin() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let unsubAdmin: null | (() => void) = null;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      // stop previous admin listener
      if (unsubAdmin) {
        unsubAdmin();
        unsubAdmin = null;
      }

      if (!u) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const ref = doc(db, "admins", u.uid);
      unsubAdmin = onSnapshot(
        ref,
        (snap) => {
          setIsAdmin(snap.exists() && snap.data()?.enabled === true);
          setLoading(false);
        },
        () => {
          setIsAdmin(false);
          setLoading(false);
        }
      );
    });

    return () => {
      if (unsubAdmin) unsubAdmin();
      unsubAuth();
    };
  }, []);

  return { loading, isAdmin };
}