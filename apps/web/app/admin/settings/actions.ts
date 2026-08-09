'use server';

import { randomUUID } from 'node:crypto';

import { activeSiteSettingsFallback, type SiteSettings } from '@project-name/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireBusinessAdminPrincipal } from '../../../lib/business-admin-session';
import { getWebBusinessAdministration } from '../../../lib/catalog-runtime';

function value(formData: FormData, name: string): string {
  const candidate = formData.get(name);
  return typeof candidate === 'string' ? candidate.trim() : '';
}

export async function activateSiteSettings(formData: FormData): Promise<never> {
  let notice = 'SITE_SETTINGS_ACTIVATED';
  try {
    const { principal, role } = await requireBusinessAdminPrincipal();
    const settings: SiteSettings = {
      businessName: value(formData, 'businessName'),
      installmentText: activeSiteSettingsFallback.installmentText,
      manufacturingLeadTime: value(formData, 'manufacturingLeadTime'),
      services: {
        delivery: value(formData, 'delivery'),
        installation: value(formData, 'installation'),
        measurement: value(formData, 'measurement'),
      },
      territory: value(formData, 'territory'),
      warranty: value(formData, 'warranty'),
      whatsappRecipient: value(formData, 'whatsappRecipient').replace(/^\+/u, ''),
    };
    await getWebBusinessAdministration().activateSettings({
      actorId: principal.actorId,
      correlationId: `site-settings-${randomUUID()}`,
      expectedVersion: Number(value(formData, 'expectedVersion')),
      reason: value(formData, 'reason'),
      role,
      settings,
    });
    revalidatePath('/admin/settings');
    revalidatePath('/request', 'layout');
  } catch (error) {
    notice =
      error instanceof Error && 'code' in error && typeof error.code === 'string'
        ? error.code
        : 'BUSINESS_ADMIN_DATABASE';
  }
  redirect(`/admin/settings?notice=${encodeURIComponent(notice)}`);
}
