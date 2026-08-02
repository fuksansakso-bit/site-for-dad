import { z } from 'zod';

import { EnvironmentValidationError } from './errors.js';
import { parseEnvironment, phase1AProfileSchema, type EnvironmentSource } from './shared.js';

export const publicEnvironmentKeys = ['NEXT_PUBLIC_APP_ENV'] as const;

export const publicEnvironmentSchema = z
  .object({
    NEXT_PUBLIC_APP_ENV: phase1AProfileSchema.optional(),
  })
  .strict();
export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;

export function parsePublicEnvironment(source: EnvironmentSource): PublicEnvironment {
  const unknownPublicKeys = Object.keys(source).filter(
    (key) => key.startsWith('NEXT_PUBLIC_') && !publicEnvironmentKeys.includes(key as never),
  );
  if (unknownPublicKeys.length > 0) {
    throw new EnvironmentValidationError(
      'public',
      unknownPublicKeys.map((key) => ({
        key,
        message: 'Variable is not on the public allowlist.',
      })),
    );
  }

  return parseEnvironment('public', publicEnvironmentSchema, source, publicEnvironmentKeys);
}
