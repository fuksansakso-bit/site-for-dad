'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getWebCustomerContacts } from '../../../lib/catalog-runtime';
import { requestAdminRole, requireRequestAdminPrincipal } from '../../../lib/request-admin-session';

export async function addCustomerContactNote(formData: FormData): Promise<never> {
  const contactId = formData.get('contactId');
  const body = formData.get('body');
  if (typeof contactId !== 'string' || typeof body !== 'string') {
    redirect('/admin/customers?notice=CUSTOMER_CONTACT_INVALID_INPUT');
  }
  const commandId = randomUUID();
  let notice = 'CUSTOMER_CONTACT_NOTE_ADDED';
  try {
    const principal = await requireRequestAdminPrincipal();
    await getWebCustomerContacts().addNote({
      actorId: principal.actorId,
      body,
      contactId,
      correlationId: `customer-contact-note-${commandId}`,
      idempotencyKey: `customer-contact:note:${commandId}`,
      role: requestAdminRole(principal),
    });
    revalidatePath(`/admin/customers/${contactId}`);
  } catch (error) {
    notice =
      error instanceof Error && 'code' in error && typeof error.code === 'string'
        ? error.code
        : 'CUSTOMER_CONTACT_DATABASE';
  }
  redirect(`/admin/customers/${contactId}?notice=${encodeURIComponent(notice)}`);
}
