import { createHmac, randomBytes } from 'node:crypto';

import type { NextRequest, NextResponse } from 'next/server';

export const previewOwnerCookieName = 'project_name_preview_owner';
const ownerTokenPattern = /^[A-Za-z0-9_-]{43}$/u;

export function createPreviewOwnerToken(): string {
  return randomBytes(32).toString('base64url');
}

export function readPreviewOwnerToken(request: NextRequest): string | null {
  const value = request.cookies.get(previewOwnerCookieName)?.value;
  return value !== undefined && ownerTokenPattern.test(value) ? value : null;
}

export function previewOwnerTokenHash(token: string, signingKey: string): string {
  if (!ownerTokenPattern.test(token)) throw new TypeError('PREVIEW_OWNER_TOKEN_INVALID');
  return createHmac('sha256', signingKey).update(`standard-preview-owner:${token}`).digest('hex');
}

export function setPreviewOwnerCookie(response: NextResponse, token: string): void {
  response.cookies.set(previewOwnerCookieName, token, {
    httpOnly: true,
    maxAge: 24 * 60 * 60,
    path: '/',
    sameSite: 'strict',
    secure: process.env['NODE_ENV'] === 'production',
  });
}
