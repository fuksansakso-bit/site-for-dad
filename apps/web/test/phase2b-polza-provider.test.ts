import { afterEach, describe, expect, it, vi } from 'vitest';

import { PolzaImageVisualizationProvider } from '../lib/ai-visualization/polza-provider';

function provider() {
  return new PolzaImageVisualizationProvider({
    apiKey: 'polza-test-key-never-real',
    baseUrl: 'https://polza.ai/api/v1',
    modelName: 'google/gemini-3.1-flash-image',
  });
}

const createInput = {
  aspectRatio: '16:9' as const,
  images: [
    { mimeType: 'image/jpeg' as const, signedUrl: 'https://project.supabase.co/window.jpg?token=x' },
    { mimeType: 'image/webp' as const, signedUrl: 'https://project.supabase.co/material.webp?token=y' },
  ] as const,
  modelName: 'google/gemini-3.1-flash-image',
  prompt: 'A'.repeat(100),
};

afterEach(() => vi.unstubAllGlobals());

describe('Polza Media API adapter', () => {
  it('uses the official asynchronous media create fields and keeps key out of body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'media_job_123',
          model: 'google/gemini-3.1-flash-image',
          status: 'pending',
        }),
        { headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'request_123' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const created = await provider().createJob(createInput);
    expect(created).toMatchObject({
      modelName: 'google/gemini-3.1-flash-image',
      providerJobId: 'media_job_123',
      providerRequestId: 'request_123',
      providerStatus: 'pending',
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://polza.ai/api/v1/media');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer polza-test-key-never-real',
      'Content-Type': 'application/json',
    });
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toEqual({
      async: true,
      input: {
        aspect_ratio: '16:9',
        images: [
          { data: createInput.images[0].signedUrl, type: 'url' },
          { data: createInput.images[1].signedUrl, type: 'url' },
        ],
        max_images: 1,
        prompt: createInput.prompt,
      },
      model: createInput.modelName,
    });
    expect(JSON.stringify(body)).not.toContain('polza-test-key-never-real');
  });

  it('maps pending and completed provider states without exposing raw response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'media_job_123', status: 'processing' })),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { url: 'https://cdn.polza.ai/results/result.jpg' },
            id: 'media_job_123',
            model: 'google/gemini-3.1-flash-image',
            status: 'completed',
          }),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const adapter = provider();
    await expect(adapter.getJobStatus('media_job_123')).resolves.toMatchObject({
      resultUrl: null,
      state: 'PROCESSING',
    });
    const completed = await adapter.getJobStatus('media_job_123');
    expect(completed).toMatchObject({
      providerJobId: 'media_job_123',
      providerStatus: 'completed',
      resultUrl: 'https://cdn.polza.ai/results/result.jpg',
      state: 'SUCCEEDED',
    });
    await expect(adapter.getResult(completed)).resolves.toEqual({
      kind: 'url',
      url: 'https://cdn.polza.ai/results/result.jpg',
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://polza.ai/api/v1/media/media_job_123');
  });

  it.each([
    [401, 'POLZA_AUTH_ERROR'],
    [402, 'POLZA_BALANCE_ERROR'],
    [429, 'POLZA_RATE_LIMITED'],
    [422, 'POLZA_INVALID_REQUEST'],
    [503, 'POLZA_PROVIDER_ERROR'],
  ] as const)('normalizes HTTP %s to %s', async (status, code) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'provider detail must stay private' }), { status }),
      ),
    );
    await expect(provider().createJob(createInput)).rejects.toMatchObject({
      code,
      safeDiagnostic: `HTTP_${status}`,
    });
  });

  it('performs at most one safe retry for status 429 and never creates a second media job', async () => {
    const statusFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 429 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'media_job_123', status: 'processing' })),
      );
    vi.stubGlobal('fetch', statusFetch);
    await expect(provider().getJobStatus('media_job_123')).resolves.toMatchObject({
      state: 'PROCESSING',
    });
    expect(statusFetch).toHaveBeenCalledTimes(2);

    const createFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 429 }));
    vi.stubGlobal('fetch', createFetch);
    await expect(provider().createJob(createInput)).rejects.toMatchObject({
      code: 'POLZA_RATE_LIMITED',
    });
    expect(createFetch).toHaveBeenCalledTimes(1);
  });
});
