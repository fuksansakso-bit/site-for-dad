'use client';

import { useState } from 'react';

export function BeforeAfter({ afterUrl, beforeUrl }: { afterUrl: string; beforeUrl: string }) {
  const [position, setPosition] = useState(50);
  return (
    <div className="before-after">
      <div className="before-after-stage">
        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived private Storage URL */}
        <img className="before-after-image" src={afterUrl} alt="AI-визуализация жалюзи" />
        <div className="before-after-before" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived private Storage URL */}
          <img className="before-after-image" src={beforeUrl} alt="Исходная фотография окна" />
        </div>
        <span className="before-after-label before-after-label-left">До</span>
        <span className="before-after-label before-after-label-right">После</span>
        <span className="before-after-divider" style={{ left: `${position}%` }} aria-hidden="true" />
      </div>
      <label className="before-after-control">
        <span>Сравнить «До / После»</span>
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

