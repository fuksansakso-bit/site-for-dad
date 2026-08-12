import 'server-only';

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import { AiVisualizationError } from './errors';

const MAX_RESULT_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 2;

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLocaleLowerCase('en-US');
  if (isIP(normalized) === 4) {
    const parts = normalized.split('.').map(Number);
    const [a = 0, b = 0] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (isIP(normalized) === 6) {
    return (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb') ||
      normalized.startsWith('::ffff:127.') ||
      normalized.startsWith('::ffff:10.') ||
      normalized.startsWith('::ffff:192.168.')
    );
  }
  return true;
}

async function verifiedPolzaUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    throw new AiVisualizationError('OUTPUT_INVALID', { cause: error });
  }
  const hostname = url.hostname.toLocaleLowerCase('en-US');
  if (
    url.protocol !== 'https:' ||
    (url.port && url.port !== '443') ||
    url.username ||
    url.password ||
    (hostname !== 'polza.ai' && !hostname.endsWith('.polza.ai'))
  ) {
    throw new AiVisualizationError('OUTPUT_INVALID');
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new AiVisualizationError('OUTPUT_INVALID');
  }
  return url;
}

async function responseBytes(response: Response): Promise<Uint8Array> {
  const declared = Number.parseInt(response.headers.get('content-length') ?? '0', 10);
  if (declared > MAX_RESULT_BYTES) throw new AiVisualizationError('OUTPUT_INVALID');
  if (!response.body) throw new AiVisualizationError('OUTPUT_INVALID');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESULT_BYTES) {
      await reader.cancel();
      throw new AiVisualizationError('OUTPUT_INVALID');
    }
    chunks.push(value);
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export async function downloadPolzaResult(value: string): Promise<{
  bytes: Uint8Array;
  declaredMime: string | null;
}> {
  let current = await verifiedPolzaUrl(value);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(current, {
        cache: 'no-store',
        headers: { Accept: 'image/jpeg,image/png,image/webp' },
        redirect: 'manual',
        signal: controller.signal,
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location || redirect === MAX_REDIRECTS) {
          throw new AiVisualizationError('OUTPUT_INVALID');
        }
        current = await verifiedPolzaUrl(new URL(location, current).toString());
        continue;
      }
      if (!response.ok) throw new AiVisualizationError('PROVIDER_UNAVAILABLE');
      return {
        bytes: await responseBytes(response),
        declaredMime: response.headers.get('content-type')?.split(';')[0]?.trim() ?? null,
      };
    } catch (error) {
      if (error instanceof AiVisualizationError) throw error;
      throw new AiVisualizationError('PROVIDER_UNAVAILABLE', { cause: error });
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }
  throw new AiVisualizationError('OUTPUT_INVALID');
}
