import { createHmac, randomBytes } from 'node:crypto';

import type { NextRequest, NextResponse } from 'next/server';

export const cartOwnerCookieName = 'project_name_cart_owner';
export const cartSessionSeconds = 7 * 24 * 60 * 60;
const ownerTokenPattern = /^[A-Za-z0-9_-]{43}$/u;

export function createCartOwnerToken(): string {
  return randomBytes(32).toString('base64url');
}

export function readCartOwnerToken(request: NextRequest): string | null {
  const value = request.cookies.get(cartOwnerCookieName)?.value;
  return value !== undefined && ownerTokenPattern.test(value) ? value : null;
}

export function cartOwnerTokenHash(token: string, signingKey: string): string {
  if (!ownerTokenPattern.test(token) || signingKey.length < 32) {
    throw new TypeError('CART_OWNER_TOKEN_INVALID');
  }
  return createHmac('sha256', signingKey).update(`phase1e-cart-owner:${token}`).digest('hex');
}

export function cartSessionExpiresAt(): string {
  return new Date(Date.now() + cartSessionSeconds * 1_000).toISOString();
}

export function setCartOwnerCookie(response: NextResponse, token: string): void {
  response.cookies.set(cartOwnerCookieName, token, {
    httpOnly: true,
    maxAge: cartSessionSeconds,
    path: '/',
    sameSite: 'strict',
    secure: process.env['NODE_ENV'] === 'production',
  });
}
