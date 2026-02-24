export const CART_UPDATED_EVENT = "hm_cart_updated";

export function notifyCartUpdated() {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}