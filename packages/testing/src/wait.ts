export interface WaitForOptions {
  readonly intervalMs?: number;
  readonly signal?: AbortSignal;
  readonly timeoutMs: number;
}

export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  options: WaitForOptions,
): Promise<void> {
  const intervalMs = options.intervalMs ?? 25;
  if (
    !Number.isSafeInteger(options.timeoutMs) ||
    options.timeoutMs < 1 ||
    !Number.isSafeInteger(intervalMs) ||
    intervalMs < 1
  ) {
    throw new TypeError('Wait bounds are invalid.');
  }
  const deadline = performance.now() + options.timeoutMs;
  while (performance.now() < deadline) {
    if (options.signal?.aborted) throw new Error('Synthetic wait aborted.');
    if (await condition()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Synthetic condition did not become true within the bounded timeout.');
}
