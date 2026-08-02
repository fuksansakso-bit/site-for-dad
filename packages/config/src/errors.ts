import type { z } from 'zod';

export interface EnvironmentIssue {
  readonly key: string;
  readonly message: string;
}

export class EnvironmentValidationError extends Error {
  readonly issues: readonly EnvironmentIssue[];

  constructor(context: string, issues: readonly EnvironmentIssue[]) {
    const keys = [...new Set(issues.map((issue) => issue.key))].sort();
    super(`Invalid ${context} environment variables: ${keys.join(', ') || 'unknown'}`);
    this.name = 'EnvironmentValidationError';
    this.issues = issues;
  }
}

export function toSafeEnvironmentIssues(error: z.ZodError): readonly EnvironmentIssue[] {
  return error.issues.map((issue) => ({
    key: issue.path.length === 0 ? 'environment' : issue.path.join('.'),
    message: issue.message,
  }));
}
