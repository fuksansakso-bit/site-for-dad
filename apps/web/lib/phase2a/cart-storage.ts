import { z } from 'zod';

import { cartItemSchema } from './schemas';
import type { CartItem } from './types';

const storedCartSchema = z.array(cartItemSchema).max(50);
const STORAGE_KEY = 'phase2a-cart';
const CHANGE_EVENT = 'phase2a-cart-change';
const EMPTY_CART: CartItem[] = [];
let cachedRaw = '';
let cachedCart: CartItem[] = EMPTY_CART;

function parseCart(raw: string): CartItem[] {
  if (raw === cachedRaw) return cachedCart;
  try {
    const parsed = storedCartSchema.safeParse(JSON.parse(raw || '[]'));
    cachedRaw = raw;
    cachedCart = parsed.success ? parsed.data : EMPTY_CART;
  } catch {
    cachedRaw = raw;
    cachedCart = EMPTY_CART;
  }
  return cachedCart;
}

export function readCart(): CartItem[] {
  try {
    return parseCart(localStorage.getItem(STORAGE_KEY) ?? '');
  } catch {
    return EMPTY_CART;
  }
}

export function writeCart(items: CartItem[]): boolean {
  const parsed = storedCartSchema.safeParse(items);
  if (!parsed.success) return false;
  try {
    const raw = JSON.stringify(parsed.data);
    localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedCart = parsed.data;
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function clearCart(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    cachedRaw = '';
    cachedCart = EMPTY_CART;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // A blocked browser store already behaves like an empty cart.
  }
}

export function getCartSnapshot(): CartItem[] {
  return readCart();
}

export function getServerCartSnapshot(): CartItem[] {
  return EMPTY_CART;
}

export function subscribeCart(onStoreChange: () => void): () => void {
  function onStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) {
      cachedRaw = '';
      onStoreChange();
    }
  }
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}
