'use client';

import { readinessResponseSchema } from '@project-name/contracts/health';
import { useEffect, useState } from 'react';

type ReadinessState = 'checking' | 'ready' | 'unavailable';

const readinessLabels: Record<ReadinessState, string> = {
  checking: 'Проверка готовности…',
  ready: 'Foundation готов к запросам',
  unavailable: 'Foundation временно не готов',
};

export function ReadinessIndicator(): React.JSX.Element {
  const [state, setState] = useState<ReadinessState>('checking');

  useEffect(() => {
    const controller = new AbortController();

    async function checkReadiness(): Promise<void> {
      try {
        const response = await fetch('/api/v1/health/ready', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        const parsed = readinessResponseSchema.safeParse(payload);
        setState(
          response.ok && parsed.success && parsed.data.status === 'ok' ? 'ready' : 'unavailable',
        );
      } catch {
        if (!controller.signal.aborted) {
          setState('unavailable');
        }
      }
    }

    void checkReadiness();
    return () => controller.abort();
  }, []);

  const label = readinessLabels[state];

  return (
    <p aria-live="polite" className={`readiness readiness-${state}`} data-testid="readiness">
      <span aria-hidden="true" className="readiness-dot" />
      {label}
    </p>
  );
}
