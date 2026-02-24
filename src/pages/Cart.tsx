import React, { useEffect, useMemo, useRef, useState } from "react";
import { IonContent, IonPage, IonToast } from "@ionic/react";
import { useHistory } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { CART_UPDATED_EVENT, notifyCartUpdated } from "../utils/cartBus";

type CartItem = {
  productId?: string; // preferred
  id?: string; // fallback old structure
  name: string;
  price: number;
  qty: number;
  storeId: string;
  storeName: string;
  size?: string | null;
  type?: "normal" | "reserve";
  image?: string | null;
};

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=60";

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem("hm_cart");
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeCart(next: CartItem[]) {
  localStorage.setItem("hm_cart", JSON.stringify(next));
  notifyCartUpdated();
}

function itemKey(it: CartItem) {
  const pid = it.productId || it.id || "";
  return `${pid}::${it.size || ""}`;
}

const Cart: React.FC = () => {
  const history = useHistory();
  const [toast, setToast] = useState<string | null>(null);

  const isLoggedIn = localStorage.getItem("hm_logged_in") === "1";

  const [cart, setCart] = useState<CartItem[]>([]);
  const [pulseTotal, setPulseTotal] = useState(false);
  const pulseTimer = useRef<number | null>(null);

  const pulse = () => {
    setPulseTotal(true);
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setPulseTotal(false), 260);
  };

  // keep cart synced (no refresh needed)
  useEffect(() => {
    const refresh = () => setCart(readCart());
    refresh();

    window.addEventListener(CART_UPDATED_EVENT, refresh as EventListener);
    return () => window.removeEventListener(CART_UPDATED_EVENT, refresh as EventListener);
  }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, { storeName: string; items: CartItem[] }>();
    for (const it of cart) {
      const prev = m.get(it.storeId);
      if (!prev) m.set(it.storeId, { storeName: it.storeName, items: [it] });
      else prev.items.push(it);
    }
    return Array.from(m.entries()).map(([storeId, v]) => ({ storeId, ...v }));
  }, [cart]);

  const deliveryFee = 5;
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal + (cart.length ? deliveryFee : 0);

  const openProduct = (it: CartItem) => {
    const pid = it.productId || it.id;
    if (!pid) return;
    history.push(`/product/${pid}`);
  };

  const checkout = () => {
    if (!cart.length) return setToast("Cart is empty.");
    if (!isLoggedIn) return history.push("/login", { from: "/checkout" } as any);
    history.push("/checkout");
  };

  const clear = () => {
    writeCart([]);
    setCart([]);
    pulse();
    setToast("Cart cleared.");
  };

  const removeItem = (key: string) => {
    const next = cart.filter((it) => itemKey(it) !== key);
    writeCart(next);
    setCart(next);
    pulse();
    setToast("Item removed.");
  };

  const setQty = (key: string, nextQty: number) => {
    const qty = Math.max(1, Math.min(99, nextQty));
    const next = cart.map((it) => (itemKey(it) === key ? { ...it, qty } : it));
    writeCart(next);
    setCart(next);
    pulse();
  };

  return (
    <IonPage>
      <AppHeader showBack backHref="/home" />

      <IonContent className="hm-content hm-camo">
        <div className="hm-wrap cart-wrap">
          {!cart.length ? (
            <div className="cart-empty">
              <div className="cart-empty-icon">🛒</div>
              <h2>Your cart is empty</h2>
              <p>Browse items and add to cart to checkout fast.</p>
              <button className="pd-primary" onClick={() => history.push("/home")} type="button">
                Continue shopping
              </button>
            </div>
          ) : (
            <>
              <div className="cart-title">Your Cart</div>

              {grouped.map((g) => (
                <div key={g.storeId} className="cart-store-card">
                  <div className="cart-store-header">
                    <div className="cart-store-name">{g.storeName}</div>
                    <div className="cart-store-sub">Prepared by store</div>
                  </div>

                  <div className="cart-items">
                    {g.items.map((it) => {
                      const key = itemKey(it);

                      return (
                        <div key={key} className="cart-item-row2">
                          {/* Clickable image */}
                          <button
                            className="cart-item-hit"
                            type="button"
                            onClick={() => openProduct(it)}
                            aria-label={`Open ${it.name}`}
                          >
                            <div
                              className="cart-item-img"
                              style={{
                                backgroundImage: `url(${it.image || FALLBACK_IMG})`,
                              }}
                            />
                          </button>

                          {/* Clickable name/meta */}
                          <button
                            className="cart-item-hit cart-item-mid"
                            type="button"
                            onClick={() => openProduct(it)}
                            aria-label={`Open ${it.name}`}
                          >
                            <div className="cart-item-name2">{it.name}</div>

                            <div className="cart-item-meta">
                              {it.size ? (
                                <span className="cart-meta-pill">Size: {it.size}</span>
                              ) : null}
                              {it.type === "reserve" ? (
                                <span className="cart-meta-pill warn">Reserve</span>
                              ) : null}
                            </div>
                          </button>

                          {/* Price + controls */}
                          <div className="cart-item-right">
                            <div className="cart-item-price2">
                              ${(it.price * it.qty).toFixed(2)}
                            </div>
                            <div className="cart-item-each">${it.price.toFixed(2)} each</div>

                            <div
                              className="cart-qtyrow"
                              style={{ justifyContent: "flex-end", marginTop: 10 }}
                            >
                              <button
                                className="cart-qtybtn"
                                onClick={() => setQty(key, it.qty - 1)}
                                type="button"
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>

                              <div className="cart-qtynum">{it.qty}</div>

                              <button
                                className="cart-qtybtn"
                                onClick={() => setQty(key, it.qty + 1)}
                                type="button"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>

                              <button
                                className="cart-remove"
                                onClick={() => removeItem(key)}
                                type="button"
                                aria-label="Remove item"
                                title="Remove item"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="cart-note">
                COD only. If a store rejects items, we deliver the rest.
              </div>

              {/* spacer so sticky bar doesn't cover the list */}
              <div className="cart-sticky-spacer" />
            </>
          )}
        </div>

        {/* Sticky bottom bar */}
        {cart.length > 0 && (
          <div className="cart-sticky">
            <div className="cart-sticky-inner">
              <div className="cart-sticky-left">
                <div className="cart-sticky-totalLabel">Total</div>
                <div className={`cart-sticky-totalValue ${pulseTotal ? "pulse" : ""}`}>
                  ${total.toFixed(2)}
                </div>
                <div className="cart-sticky-sub">
                  Subtotal ${subtotal.toFixed(2)} • Delivery ${deliveryFee.toFixed(2)}
                </div>
              </div>

              <div className="cart-sticky-actions">
                <button className="cart-sticky-clear" onClick={clear} type="button">
                  Clear
                </button>
                <button className="cart-sticky-checkout" onClick={checkout} type="button">
                  Checkout
                </button>
              </div>
            </div>
          </div>
        )}

        <IonToast
          isOpen={!!toast}
          message={toast ?? ""}
          duration={1400}
          onDidDismiss={() => setToast(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Cart;