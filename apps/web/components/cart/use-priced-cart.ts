'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import {
  getCartSnapshot,
  getServerCartSnapshot,
  subscribeCart,
} from '../../lib/phase2a/cart-storage';
import type { PricedItem } from '../../lib/phase2a/types';

export type CartQuote = {
  items: PricedItem[];
  knownTotalKopecks: number;
  pricingStatus: 'KNOWN' | 'MANUAL' | 'PARTIAL';
};

type QuoteState =
  | { status: 'idle' | 'loading'; message: string; quote: null }
  | { status: 'error'; message: string; quote: null }
  | { status: 'ready'; message: string; quote: CartQuote };

const noopSubscribe = () => () => undefined;

export function usePricedCart() {
  const cart = useSyncExternalStore(subscribeCart, getCartSnapshot, getServerCartSnapshot);
  const browserReady = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState<QuoteState>({
    message: 'Проверяем актуальную стоимость…',
    quote: null,
    status: 'idle',
  });

  useEffect(() => {
    if (!browserReady || cart.length === 0) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setState({ message: 'Проверяем актуальную стоимость…', quote: null, status: 'loading' });
      }
    });
    void fetch('/api/phase2a/price', {
      body: JSON.stringify(cart),
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      method: 'POST',
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as CartQuote & { message?: string };
        if (!response.ok) throw new Error(body.message ?? 'Расчёт временно недоступен.');
        setState({ message: '', quote: body, status: 'ready' });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            message: error instanceof Error ? error.message : 'Расчёт временно недоступен.',
            quote: null,
            status: 'error',
          });
        }
      });
    return () => controller.abort();
  }, [browserReady, cart, retryKey]);

  return {
    browserReady,
    cart,
    retry: () => setRetryKey((current) => current + 1),
    ...state,
  };
}
