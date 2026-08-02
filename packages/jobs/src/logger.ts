import { Logger, type LogLevel } from 'graphile-worker';

export interface FoundationQueueLogEvent {
  readonly event: 'queue.library';
  readonly jobId?: string;
  readonly level: 'debug' | 'error' | 'info' | 'warn';
  readonly messageCode: string;
  readonly taskIdentifier?: string;
  readonly workerId?: string;
}

export type FoundationQueueLogSink = (event: FoundationQueueLogEvent) => void;

function safeLevel(level: LogLevel): FoundationQueueLogEvent['level'] {
  return level === 'warning' ? 'warn' : level;
}

function messageCode(message: string): string {
  if (/Completed task/i.test(message)) return 'QUEUE_JOB_COMPLETED';
  if (/Failed task/i.test(message)) return 'QUEUE_JOB_FAILED';
  if (/listen/i.test(message)) return 'QUEUE_LISTENER_STATE';
  if (/shutdown|stopping/i.test(message)) return 'QUEUE_SHUTDOWN_STATE';
  return 'QUEUE_INTERNAL_STATE';
}

export function createFoundationGraphileLogger(
  sink: FoundationQueueLogSink = () => undefined,
): Logger {
  return new Logger((scope) => (level, message) => {
    sink({
      event: 'queue.library',
      ...(scope.jobId === undefined ? {} : { jobId: scope.jobId }),
      level: safeLevel(level),
      messageCode: messageCode(message),
      ...(scope.taskIdentifier === undefined ? {} : { taskIdentifier: scope.taskIdentifier }),
      ...(scope.workerId === undefined ? {} : { workerId: scope.workerId }),
    });
  });
}
