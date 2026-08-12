import { z } from 'zod';

import { cartItemSchema } from './schemas';
import type { CartItem } from './types';

const storedCartSchema = z.array(cartItemSchema).max(50);
const STORAGE_KEY = 'phase2a-cart';

export function readCart(): CartItem[] {
  try {
    const parsed = storedCartSchema.safeParse(
      JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'),
    );
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]): boolean {
  const parsed = storedCartSchema.safeParse(items);
  if (!parsed.success) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.data));
  return true;
}

export function clearCart(): void {
  localStorage.removeItem(STORAGE_KEY);
}
