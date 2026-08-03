import { correlationIdSchema } from '@project-name/contracts/health';

const traceIdPattern = /^[a-f0-9]{32}$/;

export function safeTelemetryId(candidate: string | null | undefined): string | undefined {
  if (candidate === null || candidate === undefined) return undefined;
  const parsed = correlationIdSchema.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
}

function randomTraceId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

export function resolveCorrelationId(candidate?: string | null): string {
  return safeTelemetryId(candidate) ?? globalThis.crypto.randomUUID();
}

export function resolveRequestId(candidate?: string | null): string {
  return safeTelemetryId(candidate) ?? globalThis.crypto.randomUUID();
}

export function resolveTraceId(candidate?: string | null): string {
  return candidate !== null && candidate !== undefined && traceIdPattern.test(candidate)
    ? candidate
    : randomTraceId();
}

export function traceIdFromTraceparent(candidate?: string | null): string | undefined {
  if (candidate === null || candidate === undefined) return undefined;
  const match = /^(?:[\da-f]{2})-([\da-f]{32})-[\da-f]{16}-[\da-f]{2}$/i.exec(candidate);
  const traceId = match?.[1]?.toLowerCase();
  return traceId !== undefined && traceIdPattern.test(traceId) && !/^0+$/.test(traceId)
    ? traceId
    : undefined;
}
