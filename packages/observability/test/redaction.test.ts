import { describe, expect, it } from 'vitest';

import { isSensitiveLogKey, redactUnknown } from '../src/redaction.js';

describe('telemetry redaction', () => {
  it('redacts denylisted fields, credentials, connection strings, and explicit canaries', () => {
    const canary = ['foundation', 'secret', 'canary'].join('-');
    const result = redactUnknown(
      {
        correlationId: 'correlation-safe-1234',
        databaseUrl: ['postgresql://user', 'password@localhost/database'].join(':'),
        nested: {
          authorization: 'Bearer sensitive-token',
          note: `prefix ${canary} suffix`,
          phone: '+70000000000',
        },
      },
      { secretValues: [canary] },
    );
    const serialized = JSON.stringify(result);

    expect(serialized).toContain('correlation-safe-1234');
    expect(serialized).not.toContain(canary);
    expect(serialized).not.toMatch(/password|sensitive-token|70000000000/);
  });

  it('serializes errors without stack traces and handles cycles', () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;

    expect(redactUnknown(new Error('provider message must never be emitted'))).toEqual({
      errorClass: 'Error',
    });
    expect(redactUnknown(cyclic)).toEqual({ self: '[CIRCULAR]' });
  });

  it('redacts contact values, URLs, and internal Windows paths even under safe keys', () => {
    const result = JSON.stringify(
      redactUnknown({
        note: 'reach synthetic.user@example.test at +7 (900) 000-00-00',
        provider: 'https://storage.example/private-object?signature=synthetic',
        source: 'C:\\project\\private\\source.ts',
      }),
    );

    expect(result).not.toMatch(/synthetic\.user|900|storage\.example|private\\source/i);
  });

  it('keeps the explicit denylist conservative', () => {
    expect(isSensitiveLogKey('requestBody')).toBe(true);
    expect(isSensitiveLogKey('sessionToken')).toBe(true);
    expect(isSensitiveLogKey('correlationId')).toBe(false);
  });
});
