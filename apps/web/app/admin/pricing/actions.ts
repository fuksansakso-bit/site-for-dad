'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomUUID } from 'node:crypto';

import { requireCatalogAdminPrincipal } from '../../../lib/catalog-admin-session';
import { getWebPricing } from '../../../lib/catalog-runtime';

function text(form: FormData, name: string, maximum = 512): string {
  const value = form.get(name);
  if (typeof value !== 'string' || value.trim().length < 3 || value.length > maximum) throw new Error('PRICING_ADMIN_INPUT_INVALID');
  return value.trim();
}

function uuid(form: FormData, name: string): string {
  const value = form.get(name);
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)) throw new Error('PRICING_ADMIN_INPUT_INVALID');
  return value;
}

function minor(form: FormData): number {
  const value = form.get('amountRubles');
  if (typeof value !== 'string' || !/^\d{1,9}(?:[.,]\d{1,2})?$/u.test(value)) throw new Error('PRICING_ADMIN_INPUT_INVALID');
  const [whole = '', fraction = ''] = value.replace(',', '.').split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result <= 0) throw new Error('PRICING_ADMIN_INPUT_INVALID');
  return result;
}

function identity(action: string) {
  const id = randomUUID();
  return { correlationId: `pricing-admin-${action}-${id}`, idempotencyKey: `pricing:admin:${action}:${id}` };
}

function code(error: unknown): string {
  return error instanceof Error && 'code' in error && typeof error.code === 'string'
    ? error.code : error instanceof Error && /^[A-Z][A-Z0-9_]{2,127}$/u.test(error.message)
      ? error.message : 'PRICING_ADMIN_COMMAND_FAILED';
}

async function finish(operation: () => Promise<void>, notice: string): Promise<never> {
  let result = notice;
  try { await operation(); revalidatePath('/admin/pricing'); revalidatePath('/configure'); }
  catch (error) { result = code(error); }
  redirect(`/admin/pricing?notice=${encodeURIComponent(result)}`);
}

export async function verifyPricingParity(form: FormData): Promise<never> {
  return finish(async () => {
    const principal = await requireCatalogAdminPrincipal();
    await getWebPricing().verifyParity({ actorId: principal.actorId, ...identity('parity'), priceVersionId: uuid(form, 'priceVersionId'), reason: text(form, 'reason') });
  }, 'PRICING_PARITY_VERIFIED');
}

export async function activatePriceVersion(form: FormData): Promise<never> {
  return finish(async () => {
    const principal = await requireCatalogAdminPrincipal();
    await getWebPricing().activateVersion({ actorId: principal.actorId, ...identity('activate'), priceVersionId: uuid(form, 'priceVersionId'), reason: text(form, 'reason') });
  }, 'PRICING_VERSION_ACTIVATED');
}

export async function rejectPriceVersion(form: FormData): Promise<never> {
  return finish(async () => {
    const principal = await requireCatalogAdminPrincipal();
    await getWebPricing().rejectVersion({ actorId: principal.actorId, ...identity('reject'), priceVersionId: uuid(form, 'priceVersionId'), reason: text(form, 'reason') });
  }, 'PRICING_VERSION_REJECTED');
}

export async function setPricingOverride(form: FormData): Promise<never> {
  return finish(async () => {
    const principal = await requireCatalogAdminPrincipal();
    await getWebPricing().setLocalOverride({ actorId: principal.actorId, amountMinor: minor(form), correlationId: identity('override-set').correlationId, materialVariantId: uuid(form, 'materialVariantId'), reason: text(form, 'reason') });
  }, 'PRICING_OVERRIDE_SET');
}

export async function removePricingOverride(form: FormData): Promise<never> {
  return finish(async () => {
    const principal = await requireCatalogAdminPrincipal();
    await getWebPricing().removeLocalOverride({ actorId: principal.actorId, correlationId: identity('override-remove').correlationId, materialVariantId: uuid(form, 'materialVariantId'), reason: text(form, 'reason') });
  }, 'PRICING_OVERRIDE_REMOVED');
}
