const redacted = '[REDACTED]';
const circular = '[CIRCULAR]';
const truncated = '[TRUNCATED]';

const sensitiveKeyPattern =
  /(?:address|authorization|body|connection(?:string)?|cookie|database[_-]?url|e-?mail|image|object[_-]?(?:key|url)|password|phone|provider[_-]?payload|secret|session|token)/i;
const connectionStringPattern = /\b(?:postgres(?:ql)?|mysql|redis):\/\/[^\s"']+/gi;
const credentialHeaderPattern = /\b(?:basic|bearer)\s+[A-Za-z0-9._~+/=-]+/gi;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const phonePattern = /(?<![A-Za-z0-9])\+?\d[\d ()-]{7,}\d(?![A-Za-z0-9])/g;
const urlPattern = /\bhttps?:\/\/[^\s"']+/gi;
const windowsPathPattern = /\b[A-Za-z]:\\[^\s"']+/g;

export interface RedactionOptions {
  readonly maxDepth?: number;
  readonly secretValues?: readonly string[];
}

function redactString(value: string, secretValues: readonly string[]): string {
  let result = value
    .replace(connectionStringPattern, redacted)
    .replace(credentialHeaderPattern, redacted)
    .replace(emailPattern, redacted)
    .replace(phonePattern, redacted)
    .replace(urlPattern, redacted)
    .replace(windowsPathPattern, redacted);
  for (const secretValue of secretValues) {
    if (secretValue.length >= 8) {
      result = result.replaceAll(secretValue, redacted);
    }
  }
  return result;
}

export function redactUnknown(value: unknown, options: RedactionOptions = {}): unknown {
  const maxDepth = options.maxDepth ?? 8;
  const secretValues = options.secretValues ?? [];
  const visited = new WeakSet<object>();

  function visit(candidate: unknown, depth: number, key?: string): unknown {
    if (key !== undefined && sensitiveKeyPattern.test(key)) {
      return redacted;
    }
    if (typeof candidate === 'string') {
      return redactString(candidate, secretValues);
    }
    if (
      candidate === null ||
      typeof candidate === 'number' ||
      typeof candidate === 'boolean' ||
      typeof candidate === 'undefined'
    ) {
      return candidate;
    }
    if (typeof candidate === 'bigint') {
      return candidate.toString();
    }
    if (typeof candidate !== 'object') {
      return `[${typeof candidate}]`;
    }
    if (depth >= maxDepth) {
      return truncated;
    }
    if (visited.has(candidate)) {
      return circular;
    }
    visited.add(candidate);

    if (candidate instanceof Error) {
      return {
        errorClass: /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(candidate.name)
          ? candidate.name
          : 'UnknownError',
      };
    }
    if (Array.isArray(candidate)) {
      return candidate.map((entry) => visit(entry, depth + 1));
    }

    return Object.fromEntries(
      Object.entries(candidate).map(([entryKey, entryValue]) => [
        entryKey,
        visit(entryValue, depth + 1, entryKey),
      ]),
    );
  }

  return visit(value, 0);
}

export function isSensitiveLogKey(key: string): boolean {
  return sensitiveKeyPattern.test(key);
}
