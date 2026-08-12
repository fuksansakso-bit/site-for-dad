import { z } from 'zod';

import { EnvironmentValidationError, toSafeEnvironmentIssues } from './errors.js';

export type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export const environmentProfileSchema = z.enum(['local', 'test', 'ci', 'staging', 'production']);
export type EnvironmentProfile = z.infer<typeof environmentProfileSchema>;

export const phase1AProfileSchema = z.enum(['local', 'test', 'ci']);
export type Phase1AProfile = z.infer<typeof phase1AProfileSchema>;

export const logLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);
export type LogLevel = z.infer<typeof logLevelSchema>;

export const phase1ABaseSchema = z
  .object({
    APP_ENV: phase1AProfileSchema,
    LOG_LEVEL: logLevelSchema,
  })
  .strict();

export const positiveIntegerString = (minimum: number, maximum: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .transform((value) => Number.parseInt(value, 10))
    .pipe(z.number().int().min(minimum).max(maximum));

export function selectEnvironmentKeys(
  source: EnvironmentSource,
  keys: readonly string[],
): Record<string, string | undefined> {
  return Object.fromEntries(keys.map((key) => [key, source[key]]));
}

export function parseEnvironment<T>(
  context: string,
  schema: z.ZodType<T>,
  source: EnvironmentSource,
  keys: readonly string[],
): T {
  const result = schema.safeParse(selectEnvironmentKeys(source, keys));
  if (!result.success) {
    throw new EnvironmentValidationError(context, toSafeEnvironmentIssues(result.error));
  }
  return result.data;
}
