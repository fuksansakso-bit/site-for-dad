'use client';

import { useState } from 'react';

import { readCart, writeCart } from '../../../lib/phase2a/cart-storage';
import { cartItemSchema } from '../../../lib/phase2a/schemas';

export function AddToCart({ materialSlug }: { materialSlug: string }) {
  const [width, setWidth] = useState(1000);
  const [height, setHeight] = useState(1500);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');

  function add() {
    const parsed = cartItemSchema.safeParse({
      heightMm: height,
      materialSlug,
      quantity,
      widthMm: width,
    });
    if (!parsed.success) {
      setMessage('Проверьте размеры и количество.');
      return;
    }
    const stored = writeCart([...readCart(), parsed.data]);
    setMessage(stored ? 'Добавлено в корзину' : 'В корзине может быть не больше 50 позиций.');
  }

  return (
    <div className="form">
      <label>
        Ширина, мм
        <input
          type="number"
          min="100"
          max="10000"
          value={width}
          onChange={(event) => setWidth(Number(event.target.value))}
        />
      </label>
      <label>
        Высота, мм
        <input
          type="number"
          min="100"
          max="10000"
          value={height}
          onChange={(event) => setHeight(Number(event.target.value))}
        />
      </label>
      <label>
        Количество
        <input
          type="number"
          min="1"
          max="100"
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
        />
      </label>
      <button onClick={add}>Добавить в корзину</button>
      <span aria-live="polite">{message}</span>
    </div>
  );
}
