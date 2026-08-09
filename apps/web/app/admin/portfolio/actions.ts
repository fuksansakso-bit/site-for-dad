'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getWebPortfolio } from '../../../lib/catalog-runtime';
import { requestAdminRole, requireRequestAdminPrincipal } from '../../../lib/request-admin-session';

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function optional(formData: FormData, name: string): string | null {
  const value = text(formData, name).trim();
  return value === '' ? null : value;
}

function errorCode(error: unknown): string {
  return error instanceof Error && 'code' in error && typeof error.code === 'string'
    ? error.code
    : 'PORTFOLIO_DATABASE';
}

export async function createPortfolioItem(formData: FormData): Promise<never> {
  const commandId = randomUUID();
  let notice = 'PORTFOLIO_ITEM_CREATED';
  try {
    const principal = await requireRequestAdminPrincipal();
    await getWebPortfolio().addItem({
      actorId: principal.actorId,
      category: text(formData, 'category'),
      completedOn: optional(formData, 'completedOn'),
      correlationId: `portfolio-create-${commandId}`,
      description: text(formData, 'description'),
      locality: optional(formData, 'locality'),
      rightsEvidence: optional(formData, 'rightsEvidence'),
      role: requestAdminRole(principal),
      slug: text(formData, 'slug').trim().toLowerCase(),
      title: text(formData, 'title'),
    });
    revalidatePath('/admin/portfolio');
  } catch (error) {
    notice = errorCode(error);
  }
  redirect(`/admin/portfolio?notice=${encodeURIComponent(notice)}`);
}

async function itemCommand(formData: FormData, action: 'hide' | 'publish'): Promise<never> {
  const itemId = text(formData, 'itemId');
  const commandId = randomUUID();
  let notice = action === 'publish' ? 'PORTFOLIO_ITEM_PUBLISHED' : 'PORTFOLIO_ITEM_HIDDEN';
  try {
    const principal = await requireRequestAdminPrincipal();
    const input = {
      actorId: principal.actorId,
      correlationId: `portfolio-${action}-${commandId}`,
      itemId,
      role: requestAdminRole(principal),
    } as const;
    if (action === 'publish') await getWebPortfolio().publishItem(input);
    else await getWebPortfolio().hideItem(input);
    revalidatePath('/admin/portfolio');
    revalidatePath('/portfolio');
  } catch (error) {
    notice = errorCode(error);
  }
  redirect(`/admin/portfolio?notice=${encodeURIComponent(notice)}`);
}

export async function publishPortfolioItem(formData: FormData): Promise<never> {
  return itemCommand(formData, 'publish');
}

export async function hidePortfolioItem(formData: FormData): Promise<never> {
  return itemCommand(formData, 'hide');
}
