import { IdentityError } from '@project-name/identity';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function staffErrorResponse(error: unknown, correlationId: string): NextResponse {
  const validation =
    error instanceof ZodError ||
    (error instanceof IdentityError && error.code === 'IDENTITY_VALIDATION_ERROR');
  const authentication =
    error instanceof IdentityError && error.code === 'IDENTITY_AUTHENTICATION_REQUIRED';
  const permission = error instanceof IdentityError && error.code === 'IDENTITY_PERMISSION_DENIED';
  const conflict = error instanceof IdentityError && error.code === 'IDENTITY_CONFLICT';
  const rate = error instanceof IdentityError && error.code === 'IDENTITY_RATE_LIMITED';
  const status = validation
    ? 400
    : authentication
      ? 401
      : permission
        ? 403
        : conflict
          ? 409
          : rate
            ? 429
            : 503;
  const message = validation
    ? 'Проверьте заполненные поля.'
    : authentication
      ? 'Войдите как сотрудник.'
      : permission
        ? 'У вас нет прав на это действие.'
        : conflict
          ? 'Данные уже изменились. Обновите страницу.'
          : rate
            ? 'Слишком много попыток. Подождите и повторите.'
            : 'Сервис временно недоступен.';
  return NextResponse.json(
    {
      code: status === 503 ? 'DEPENDENCY_UNAVAILABLE' : 'REQUEST_REJECTED',
      correlationId,
      message,
    },
    { headers: { 'Cache-Control': 'no-store' }, status },
  );
}
