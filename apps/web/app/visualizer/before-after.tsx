'use client';

import { type PointerEvent, useRef, useState } from 'react';

export function BeforeAfter({ afterUrl, beforeUrl }: { afterUrl: string; beforeUrl: string }) {
  const [position, setPosition] = useState(50);
  const stageRef = useRef<HTMLDivElement>(null);

  function updatePosition(clientX: number) {
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) return;
    const next = Math.round(((clientX - bounds.left) / bounds.width) * 100);
    setPosition(Math.min(100, Math.max(0, next)));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePosition(event.clientX);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    updatePosition(event.clientX);
  }

  return (
    <div className="before-after">
      <div
        className="before-after-stage"
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived private Storage URL */}
        <img className="before-after-image" src={afterUrl} alt="AI-визуализация жалюзи" />
        <div
          className="before-after-before"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived private Storage URL */}
          <img className="before-after-image" src={beforeUrl} alt="Исходная фотография окна" />
        </div>
        <span className="before-after-label before-after-label-left">До</span>
        <span className="before-after-label before-after-label-right">После</span>
        <span className="before-after-divider" style={{ left: `${position}%` }} aria-hidden="true">
          <span>↔</span>
        </span>
      </div>
      <label className="before-after-control">
        <span>
          <strong>Сравнить «До / После»</strong>
          <output>{position}% исходного кадра</output>
        </span>
        <input
          aria-label="Положение сравнения до и после"
          max="100"
          min="0"
          type="range"
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
