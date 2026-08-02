'use client';

import { useState } from 'react';

export function ErrorProbe(): React.JSX.Element {
  const [shouldFail, setShouldFail] = useState(false);

  if (shouldFail) {
    throw new Error('Synthetic Phase 1A error-boundary probe');
  }

  return (
    <button className="secondary-button" onClick={() => setShouldFail(true)} type="button">
      Проверить безопасную обработку ошибки
    </button>
  );
}
