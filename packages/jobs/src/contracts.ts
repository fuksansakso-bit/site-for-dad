import { correlationIdSchema } from '@project-name/contracts/health';
import { z } from 'zod';

export const foundationProbeTaskIdentifier = 'foundation_probe_v1' as const;
export const foundationProbeQueueName = 'foundation-probe' as const;

export const foundationProbeModes = [
  'SUCCEED',
  'FAIL_ONCE',
  'TIMEOUT_ONCE',
  'ALWAYS_FAIL',
] as const;

export const foundationProbePayloadSchema = z
  .object({
    correlationId: correlationIdSchema,
    delayMilliseconds: z.number().int().min(0).max(60_000).default(0),
    idempotencyKey: z
      .string()
      .min(24)
      .max(160)
      .regex(/^foundation-probe:[a-z0-9][a-z0-9-]+$/),
    mode: z.enum(foundationProbeModes),
    schemaVersion: z.literal(1),
  })
  .strict();

export type FoundationProbePayload = z.infer<typeof foundationProbePayloadSchema>;
