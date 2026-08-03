import { describe, expect, it } from 'vitest';

import { AmigoHttpTransport } from '../src/adapters/amigo/transport.js';

const pageUrl = 'https://shop.amigo.ru/rulonnye-shtory/rulonnye-tkani/';

function htmlResponse(body = '<div class="catalog_all__item"></div>'): Response {
  return new Response(body, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
    status: 200,
  });
}

describe('AMIGO bounded HTTP transport', () => {
  it('retries a transient response with bounded backoff', async () => {
    let calls = 0;
    const delays: number[] = [];
    const transport = new AmigoHttpTransport({
      fetchImplementation: async () => {
        calls += 1;
        return calls === 1 ? new Response(null, { status: 503 }) : htmlResponse();
      },
      hostResolver: async () => ['93.184.216.34'],
      maximumAttempts: 2,
      minimumDelayMs: 0,
      random: () => 0,
      sleep: async (milliseconds) => void delays.push(milliseconds),
    });

    await expect(transport.fetchPage(pageUrl)).resolves.toMatchObject({ httpStatus: 200 });
    expect(calls).toBe(2);
    expect(delays).toEqual([250]);
  });

  it('never retries an authorization challenge', async () => {
    let calls = 0;
    const transport = new AmigoHttpTransport({
      fetchImplementation: async () => {
        calls += 1;
        return new Response(null, { status: 403 });
      },
      hostResolver: async () => ['93.184.216.34'],
      maximumAttempts: 3,
      minimumDelayMs: 0,
    });

    await expect(transport.fetchPage(pageUrl)).rejects.toMatchObject({
      code: 'SOURCE_CAPTCHA_OR_CHALLENGE',
      retryable: false,
    });
    expect(calls).toBe(1);
  });

  it('distinguishes a passive contact CAPTCHA from a catalog access challenge', async () => {
    const accepted = new AmigoHttpTransport({
      fetchImplementation: async () =>
        htmlResponse(
          '<div class="product-card"><h2>FixLine</h2></div><form class="captcha"></form>',
        ),
      hostResolver: async () => ['93.184.216.34'],
      minimumDelayMs: 0,
    });
    await expect(accepted.fetchPage(pageUrl)).resolves.toMatchObject({ httpStatus: 200 });

    const rejected = new AmigoHttpTransport({
      fetchImplementation: async () => htmlResponse('<form class="captcha"></form>'),
      hostResolver: async () => ['93.184.216.34'],
      maximumAttempts: 1,
      minimumDelayMs: 0,
    });
    await expect(rejected.fetchPage(pageUrl)).rejects.toMatchObject({
      code: 'SOURCE_CAPTCHA_OR_CHALLENGE',
    });
  });

  it('rejects oversized source responses before parsing', async () => {
    const transport = new AmigoHttpTransport({
      fetchImplementation: async () =>
        new Response('small body', {
          headers: {
            'content-length': '2048',
            'content-type': 'text/html',
          },
          status: 200,
        }),
      hostResolver: async () => ['93.184.216.34'],
      maximumAttempts: 1,
      maximumHtmlBytes: 1024,
      minimumDelayMs: 0,
    });

    await expect(transport.fetchPage(pageUrl)).rejects.toMatchObject({
      code: 'SOURCE_CONTENT_TOO_LARGE',
    });
  });

  it('serializes concurrent reads to one in-flight request', async () => {
    let active = 0;
    let maximumActive = 0;
    const transport = new AmigoHttpTransport({
      fetchImplementation: async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return htmlResponse();
      },
      hostResolver: async () => ['93.184.216.34'],
      minimumDelayMs: 0,
    });

    await Promise.all([
      transport.fetchPage(pageUrl),
      transport.fetchPage('https://shop.amigo.ru/rulonnye-shtory-zebra/rulonnye-tkani-zebra/'),
    ]);
    expect(maximumActive).toBe(1);
  });
});
