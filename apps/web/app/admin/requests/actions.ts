'use server';

import { randomUUID } from 'node:crypto';

import { requestNumberSchema, requestStatusSchema } from '@project-name/contracts/request';
import { IdentityError } from '@project-name/identity';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getWebRequests } from '../../../lib/catalog-runtime';
import {
  clearRequestAdminSession,
  requestAdminRole,
  requireRequestAdminPrincipal,
  setRequestAdminSession,
} from '../../../lib/request-admin-session';

function command(action: string) {
  const id = randomUUID();
  return {
    correlationId: `request-admin-${action}-${id}`,
    idempotencyKey: `request:admin:${action}:${id}`,
  };
}

function failureCode(error: unknown): string {
  if (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    /^[A-Z][A-Z0-9_]{2,127}$/u.test(error.code)
  ) {
    return error.code;
  }
  return 'REQUEST_ADMIN_COMMAND_FAILED';
}

async function finish(
  requestNumber: string,
  operation: () => Promise<void>,
  success: string,
): Promise<never> {
  let notice = success;
  try {
    await operation();
    revalidatePath('/admin/requests');
    revalidatePath(`/admin/requests/${requestNumber}`);
  } catch (error) {
    notice = failureCode(error);
  }
  redirect(`/admin/requests/${requestNumber}?notice=${encodeURIComponent(notice)}`);
}

export async function signInRequestAdmin(formData: FormData): Promise<never> {
  const token = formData.get('token');
  let notice = 'REQUEST_ADMIN_SESSION_OPENED';
  try {
    if (typeof token !== 'string' || token.length < 32 || token.length > 128) {
      throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
    }
    await setRequestAdminSession(token);
  } catch (error) {
    notice = failureCode(error);
  }
  redirect(`/admin/requests?notice=${encodeURIComponent(notice)}`);
}

export async function signOutRequestAdmin(): Promise<never> {
  await clearRequestAdminSession();
  redirect('/admin/requests?notice=REQUEST_ADMIN_SESSION_CLOSED');
}

export async function changeRequestStatus(formData: FormData): Promise<never> {
  const requestNumber = requestNumberSchema.parse(formData.get('requestNumber'));
  return finish(
    requestNumber,
    async () => {
      const principal = await requireRequestAdminPrincipal();
      const expectedVersion = Number(formData.get('expectedVersion'));
      const status = requestStatusSchema.parse(formData.get('status'));
      await getWebRequests().updateAdminStatus({
        actorId: principal.actorId,
        ...command('status'),
        expectedVersion,
        requestNumber,
        role: requestAdminRole(principal),
        status,
      });
    },
    'REQUEST_STATUS_UPDATED',
  );
}

export async function addRequestNote(formData: FormData): Promise<never> {
  const requestNumber = requestNumberSchema.parse(formData.get('requestNumber'));
  return finish(
    requestNumber,
    async () => {
      const principal = await requireRequestAdminPrincipal();
      const body = formData.get('body');
      if (typeof body !== 'string') throw new TypeError('REQUEST_NOTE_INVALID');
      await getWebRequests().addAdminNote({
        actorId: principal.actorId,
        body,
        ...command('note'),
        requestNumber,
        role: requestAdminRole(principal),
      });
    },
    'REQUEST_NOTE_ADDED',
  );
}

export async function revokeRequestPublicReference(formData: FormData): Promise<never> {
  const requestNumber = requestNumberSchema.parse(formData.get('requestNumber'));
  return finish(
    requestNumber,
    async () => {
      const principal = await requireRequestAdminPrincipal();
      await getWebRequests().revokePublicReference({
        actorId: principal.actorId,
        ...command('revoke-public'),
        requestNumber,
        role: requestAdminRole(principal),
      });
    },
    'REQUEST_PUBLIC_REFERENCE_REVOKED',
  );
}
