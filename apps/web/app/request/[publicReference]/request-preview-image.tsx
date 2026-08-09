'use client';

import { useState } from 'react';

export function RequestPreviewImage({
  alt,
  src,
}: {
  readonly alt: string;
  readonly src: string;
}): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className="request-preview-fallback">Примерка временно недоступна</div>;
  }
  return (
    // The authenticated request-reference route verifies rights and streams the immutable asset.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} className="request-preview-image" onError={() => setFailed(true)} src={src} />
  );
}
