import { z } from 'zod';

export const correlationIdSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);

export const dependencyHealthSchema = z.enum(['ok', 'unavailable']);
export type DependencyHealth = z.infer<typeof dependencyHealthSchema>;

export const livenessResponseSchema = z
  .object({
    correlationId: correlationIdSchema,
    status: z.literal('ok'),
  })
  .strict();
export type LivenessResponse = z.infer<typeof livenessResponseSchema>;

export const readinessResponseSchema = z
  .object({
    checks: z.record(z.string().min(1).max(64), dependencyHealthSchema),
    correlationId: correlationIdSchema,
    status: z.enum(['ok', 'unavailable']),
  })
  .strict()
  .superRefine((value, context) => {
    const hasUnavailableDependency = Object.values(value.checks).includes('unavailable');
    if ((value.status === 'unavailable') !== hasUnavailableDependency) {
      context.addIssue({
        code: 'custom',
        message: 'Readiness status must match dependency checks.',
        path: ['status'],
      });
    }
  });
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
