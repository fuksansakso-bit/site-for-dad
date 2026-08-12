const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

export function isSameOriginOrLoopbackAlias(source: string, target: string): boolean {
  try {
    const sourceUrl = new URL(source);
    const targetUrl = new URL(target);
    if (sourceUrl.origin === targetUrl.origin) return true;

    return (
      sourceUrl.protocol === targetUrl.protocol &&
      sourceUrl.port === targetUrl.port &&
      LOOPBACK_HOSTS.has(sourceUrl.hostname) &&
      LOOPBACK_HOSTS.has(targetUrl.hostname)
    );
  } catch {
    return false;
  }
}
