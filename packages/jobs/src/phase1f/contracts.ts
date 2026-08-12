import { z } from 'zod';

export const phase1fJobQueueName = 'phase1f-operations';
export const phase1fJobIdentifiers = {
  cleanupIdentity: 'phase1f.cleanup_identity.v1',
  deliverEmail: 'phase1f.deliver_email.v1',
  processPortfolioMedia: 'phase1f.process_portfolio_media.v1',
} as const;

const base = z
  .object({
    correlationId: z
      .string()
      .min(8)
      .max(128)
      .regex(/^[A-Za-z0-9._:-]+$/),
    idempotencyKey: z.string().min(8).max(255),
  })
  .strict();

export const deliverEmailPayloadSchema = base.extend({ deliveryId: z.string().uuid() }).strict();
export const cleanupIdentityPayloadSchema = base
  .extend({ scheduledFor: z.iso.datetime() })
  .strict();
export const processPortfolioMediaPayloadSchema = base
  .extend({ portfolioMediaId: z.string().uuid() })
  .strict();

export type DeliverEmailPayload = z.infer<typeof deliverEmailPayloadSchema>;
export type CleanupIdentityPayload = z.infer<typeof cleanupIdentityPayloadSchema>;
export type ProcessPortfolioMediaPayload = z.infer<typeof processPortfolioMediaPayloadSchema>;
