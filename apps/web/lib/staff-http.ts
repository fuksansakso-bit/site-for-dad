import { IdentityError } from '@project-name/identity';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function staffErrorResponse(error: unknown, correlationId: string): NextResponse {
  const domainCode =
    error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code : null;
  const validation =
    error instanceof ZodError ||
    (error instanceof IdentityError && error.code === 'IDENTITY_VALIDATION_ERROR') ||
    domainCode?.endsWith('_INVALID_INPUT') === true;
  const authentication =
    error instanceof IdentityError && error.code === 'IDENTITY_AUTHENTICATION_REQUIRED';
  const permission =
    (error instanceof IdentityError && error.code === 'IDENTITY_PERMISSION_DENIED') ||
    domainCode?.endsWith('_AUTHORIZATION') === true;
  const conflict = error instanceof IdentityError && error.code === 'IDENTITY_CONFLICT';
  const rate = error instanceof IdentityError && error.code === 'IDENTITY_RATE_LIMITED';
  const missing = domainCode?.endsWith('_NOT_FOUND') === true;
  const status = validation
    ? 400
    : authentication
      ? 401
      : permission
        ? 403
        : missing
          ? 404
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
        : missing
          ? 'Запись не найдена.'
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
