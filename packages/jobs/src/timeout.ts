import { FoundationJobError } from './errors.js';

export async function runWithJobTimeout<T>(
  timeoutMilliseconds: number,
  shutdownSignal: AbortSignal,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let rejectBoundary: ((error: FoundationJobError) => void) | undefined;

  const boundary = new Promise<never>((_resolve, reject) => {
    rejectBoundary = reject;
  });
  const abortForShutdown = () => {
    controller.abort();
    rejectBoundary?.(new FoundationJobError('FOUNDATION_JOB_ABORTED'));
  };
  if (shutdownSignal.aborted) {
    abortForShutdown();
  } else {
    shutdownSignal.addEventListener('abort', abortForShutdown, { once: true });
  }

  const timeout = setTimeout(() => {
    controller.abort();
    rejectBoundary?.(new FoundationJobError('FOUNDATION_JOB_TIMEOUT'));
  }, timeoutMilliseconds);
  timeout.unref();

  try {
    return await Promise.race([operation(controller.signal), boundary]);
  } finally {
    clearTimeout(timeout);
    shutdownSignal.removeEventListener('abort', abortForShutdown);
  }
}

export async function abortableDelay(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (milliseconds === 0) return;
  await new Promise<void>((resolve, reject) => {
    const complete = () => {
      signal.removeEventListener('abort', abort);
      resolve();
    };
    const timeout = setTimeout(complete, milliseconds);
    const abort = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      reject(new FoundationJobError('FOUNDATION_JOB_ABORTED'));
    };
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
    timeout.unref();
  });
}
