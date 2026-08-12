import { describe, expect, it, vi } from 'vitest';

import { downloadConfirmedUpload } from '../lib/ai-visualization/storage-retry';

describe('AI signed-upload confirmation', () => {
  it('retries a temporarily invisible Storage object', async () => {
    vi.useFakeTimers();
    const download = vi
      .fn<() => Promise<{ data: Blob | null; error: Error | null }>>()
      .mockResolvedValueOnce({ data: null, error: new Error('not visible yet') })
      .mockResolvedValueOnce({ data: new Blob(['ready']), error: null });

    const pending = downloadConfirmedUpload(download);
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toMatchObject({ error: null });
    expect(download).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('returns the final Storage failure after the bounded retry window', async () => {
    vi.useFakeTimers();
    const finalError = new Error('still unavailable');
    const download = vi.fn(async () => ({ data: null, error: finalError }));

    const pending = downloadConfirmedUpload(download);
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toEqual({ data: null, error: finalError });
    expect(download).toHaveBeenCalledTimes(4);
    vi.useRealTimers();
  });
});
