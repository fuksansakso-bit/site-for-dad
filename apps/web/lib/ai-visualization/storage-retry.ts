import 'server-only';

import { setTimeout as delay } from 'node:timers/promises';

const CONFIRM_DOWNLOAD_DELAYS_MS = [0, 200, 600, 1_300] as const;

type StorageDownload<T> = {
  data: T | null;
  error: unknown;
};

export async function downloadConfirmedUpload<T>(
  download: () => Promise<StorageDownload<T>>,
): Promise<StorageDownload<T>> {
  let lastResult: StorageDownload<T> = { data: null, error: null };

  for (const delayMs of CONFIRM_DOWNLOAD_DELAYS_MS) {
    if (delayMs > 0) await delay(delayMs);
    lastResult = await download();
    if (lastResult.data && !lastResult.error) return lastResult;
  }

  return lastResult;
}
