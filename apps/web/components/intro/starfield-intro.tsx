'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'intro_seen_v1';
const INTRO_DURATION_MS = 2300;

type IntroMode = 'checking' | 'canvas' | 'static' | 'closing' | 'hidden';
type BrowserNavigator = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
};

type Star = {
  angle: number;
  depth: number;
  size: number;
  speed: number;
};

function prefersSimpleIntro(): boolean {
  const browser = navigator as BrowserNavigator;
  return (
    window.matchMedia('(max-width: 700px)').matches ||
    (browser.hardwareConcurrency > 0 && browser.hardwareConcurrency <= 4) ||
    (browser.deviceMemory != null && browser.deviceMemory <= 4) ||
    browser.connection?.saveData === true
  );
}

function initialIntroMode(): IntroMode {
  if (typeof window === 'undefined') return 'checking';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    if (localStorage.getItem(STORAGE_KEY) === '1' || reducedMotion) return 'hidden';
  } catch {
    if (reducedMotion) return 'hidden';
  }
  return prefersSimpleIntro() ? 'static' : 'canvas';
}

export function StarfieldIntro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<IntroMode>(initialIntroMode);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Storage may be unavailable; the intro still remains safely dismissible.
    }
    setMode((current) => (current === 'hidden' ? current : 'closing'));
  }, []);

  useEffect(() => {
    if (mode !== 'canvas' && mode !== 'static') return;
    const timer = window.setTimeout(finish, INTRO_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [finish, mode]);

  useEffect(() => {
    if (mode !== 'closing') return;
    const timer = window.setTimeout(() => setMode('hidden'), 320);
    return () => window.clearTimeout(timer);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'canvas') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;
    const activeCanvas: HTMLCanvasElement = canvas;
    const drawingContext: CanvasRenderingContext2D = context;

    const starCount = Math.min(120, Math.max(72, Math.round(window.innerWidth / 13)));
    const stars: Star[] = Array.from({ length: starCount }, (_, index) => ({
      angle: (index / starCount) * Math.PI * 2 + Math.sin(index * 9.7),
      depth: ((index * 37) % starCount) / starCount,
      size: 0.45 + ((index * 11) % 9) / 10,
      speed: 0.00006 + ((index * 17) % 8) * 0.000008,
    }));
    let frame = 0;
    let previous = performance.now();

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      activeCanvas.width = Math.round(window.innerWidth * ratio);
      activeCanvas.height = Math.round(window.innerHeight * ratio);
      activeCanvas.style.width = `${window.innerWidth}px`;
      activeCanvas.style.height = `${window.innerHeight}px`;
      drawingContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function draw(now: number) {
      const delta = Math.min(34, now - previous);
      previous = now;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const centerX = width * 0.5;
      const centerY = height * 0.48;
      const radius = Math.hypot(width, height) * 0.56;
      drawingContext.fillStyle = '#10120f';
      drawingContext.fillRect(0, 0, width, height);

      for (const star of stars) {
        star.depth = (star.depth + delta * star.speed) % 1;
        const eased = star.depth * star.depth;
        const x = centerX + Math.cos(star.angle) * radius * eased;
        const y = centerY + Math.sin(star.angle) * radius * eased * 0.64;
        const alpha = Math.min(0.92, 0.12 + eased * 0.9);
        const size = star.size + eased * 1.3;
        drawingContext.beginPath();
        drawingContext.fillStyle = `rgba(243, 240, 233, ${alpha})`;
        drawingContext.arc(x, y, size, 0, Math.PI * 2);
        drawingContext.fill();
      }

      const glow = drawingContext.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        width * 0.16,
      );
      glow.addColorStop(0, 'rgba(183, 154, 99, 0.24)');
      glow.addColorStop(1, 'rgba(183, 154, 99, 0)');
      drawingContext.fillStyle = glow;
      drawingContext.fillRect(0, 0, width, height);
      frame = window.requestAnimationFrame(draw);
    }

    function onVisibilityChange() {
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
      } else {
        previous = performance.now();
        frame = window.requestAnimationFrame(draw);
      }
    }

    resize();
    frame = window.requestAnimationFrame(draw);
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [mode]);

  if (mode === 'checking' || mode === 'hidden') return null;

  return (
    <div
      aria-label="Короткое вступление"
      className={`intro-overlay ${mode === 'static' ? 'intro-static' : ''} ${
        mode === 'closing' ? 'intro-closing' : ''
      }`}
    >
      {mode !== 'static' && <canvas aria-hidden="true" ref={canvasRef} />}
      <div className="intro-static-stars" aria-hidden="true" />
      <div className="intro-message">
        <span className="intro-line" aria-hidden="true" />
        <p>Свет · фактура · пространство</p>
        <strong>Интерьер начинается с окна</strong>
      </div>
      <button className="intro-skip" onClick={finish} type="button">
        Пропустить
      </button>
    </div>
  );
}
