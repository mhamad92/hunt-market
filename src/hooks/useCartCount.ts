// src/hooks/useCartCount.ts
import { useCallback, useEffect, useState } from "react";
import { CART_UPDATED_EVENT } from "../utils/cartBus";

type CartItem = { qty?: number };

function readCount(): number {
  try {
    const raw = localStorage.getItem("hm_cart");
    if (!raw) return 0;
    const cart = JSON.parse(raw) as CartItem[];
    return cart.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  } catch {
    return 0;
  }
}

export default function useCartCount() {
  const [count, setCount] = useState<number>(() => readCount());

  const refresh = useCallback(() => {
    setCount(readCount());
  }, []);

  useEffect(() => {
    const onStorage = () => refresh(); // other tabs
    const onUpdated = () => refresh(); // same tab updates
    const onFocus = () => refresh(); // when returning to app/window

    window.addEventListener("storage", onStorage);
    window.addEventListener(CART_UPDATED_EVENT, onUpdated);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CART_UPDATED_EVENT, onUpdated);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return { count, refresh };
}