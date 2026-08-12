import type { AiVisualizationErrorCode } from './types';

const SAFE_MESSAGES: Record<AiVisualizationErrorCode, string> = {
  AI_DISABLED: 'AI-визуализация временно недоступна. Вы можете добавить материал в корзину или написать нам в WhatsApp.',
  INVALID_IMAGE: 'Не удалось обработать фотографию. Выберите другое фото окна.',
  IMAGE_TOO_LARGE: 'Фотография слишком большая. Выберите другое фото или уменьшите его.',
  IMAGE_TOO_SMALL: 'Фотография слишком маленькая. Выберите более чёткое фото окна.',
  UNSUPPORTED_IMAGE_TYPE: 'Поддерживаются только JPEG, PNG и WebP.',
  MATERIAL_NOT_FOUND: 'Этот материал больше недоступен. Выберите другой материал.',
  MATERIAL_IMAGE_UNAVAILABLE: 'Изображение выбранного материала временно недоступно.',
  CONSENT_REQUIRED: 'Подтвердите согласие на обработку фотографии.',
  RATE_LIMITED: 'Слишком много попыток. Подождите немного и попробуйте снова.',
  DAILY_LIMIT_REACHED: 'Лимит AI-визуализаций на сегодня исчерпан. Вы можете добавить материал в корзину или написать нам в WhatsApp.',
  JOB_ALREADY_RUNNING: 'Визуализация уже создаётся. Дождитесь результата текущей задачи.',
  PROVIDER_UNAVAILABLE: 'AI-визуализация временно недоступна. Попробуйте позже.',
  PROVIDER_RATE_LIMITED: 'Сервис визуализации временно перегружен. Попробуйте немного позже.',
  PROVIDER_REJECTED: 'Не удалось создать визуализацию по этой фотографии. Выберите другое фото и попробуйте снова.',
  OUTPUT_INVALID: 'Не удалось получить готовое изображение. Попробуйте создать ещё один вариант.',
  STORAGE_UNAVAILABLE: 'Хранилище фотографий временно недоступно. Попробуйте позже.',
  JOB_EXPIRED: 'AI-визуализация больше недоступна.',
  INTERNAL_ERROR: 'Не удалось выполнить запрос. Попробуйте позже.',
};

const HTTP_STATUS: Record<AiVisualizationErrorCode, number> = {
  AI_DISABLED: 503,
  INVALID_IMAGE: 422,
  IMAGE_TOO_LARGE: 413,
  IMAGE_TOO_SMALL: 422,
  UNSUPPORTED_IMAGE_TYPE: 415,
  MATERIAL_NOT_FOUND: 404,
  MATERIAL_IMAGE_UNAVAILABLE: 409,
  CONSENT_REQUIRED: 400,
  RATE_LIMITED: 429,
  DAILY_LIMIT_REACHED: 429,
  JOB_ALREADY_RUNNING: 409,
  PROVIDER_UNAVAILABLE: 503,
  PROVIDER_RATE_LIMITED: 429,
  PROVIDER_REJECTED: 422,
  OUTPUT_INVALID: 502,
  STORAGE_UNAVAILABLE: 503,
  JOB_EXPIRED: 410,
  INTERNAL_ERROR: 500,
};

const RETRYABLE = new Set<AiVisualizationErrorCode>([
  'RATE_LIMITED',
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_RATE_LIMITED',
  'OUTPUT_INVALID',
  'STORAGE_UNAVAILABLE',
  'INTERNAL_ERROR',
]);

export class AiVisualizationError extends Error {
  readonly code: AiVisualizationErrorCode;
  readonly status: number;
  readonly retryable: boolean;

  constructor(code: AiVisualizationErrorCode, options?: { cause?: unknown; status?: number }) {
    super(SAFE_MESSAGES[code], options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'AiVisualizationError';
    this.code = code;
    this.status = options?.status ?? HTTP_STATUS[code];
    this.retryable = RETRYABLE.has(code);
  }
}

export function safeAiError(error: unknown): AiVisualizationError {
  return error instanceof AiVisualizationError
    ? error
    : new AiVisualizationError('INTERNAL_ERROR', { cause: error });
}

export function safeAiMessage(code: AiVisualizationErrorCode): string {
  return SAFE_MESSAGES[code];
}

