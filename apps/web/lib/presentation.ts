import type { Availability, PricingMode, StaffRole } from './phase2a/types';
import type {
  AiVisualizationErrorCode,
  BlindFamily,
  PolzaProviderErrorCode,
} from './ai-visualization/types';

export const NEUTRAL_SITE_NAME = 'Жалюзи на заказ';

export function resolvePublicSiteName(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.toUpperCase() !== 'PROJECT_NAME' ? normalized : NEUTRAL_SITE_NAME;
}

export function buildWhatsAppHref(value: string | null | undefined): string | null {
  const digits = value?.replace(/\D/g, '') ?? '';
  return digits.length >= 10 && digits.length <= 15 ? `https://wa.me/${digits}` : null;
}

export const staffRoleLabel: Record<StaffRole, string> = {
  OWNER: 'Владелец',
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
};

export const pricingModeLabel: Record<PricingMode, string> = {
  AMIGO_EXACT: 'Точная цена AMIGO',
  AREA: 'По площади',
  FIXED: 'Фиксированная цена',
  MANUAL: 'По запросу',
};

export const availabilityLabel: Record<Availability, string> = {
  AVAILABLE: 'Доступно к заказу',
  INQUIRY_ONLY: 'Уточнить у менеджера',
  OUT_OF_STOCK: 'Временно недоступно',
};

export function presentStaffRole(value: string): string {
  return staffRoleLabel[value as StaffRole] ?? 'Роль уточняется';
}

export function presentPricingMode(value: string): string {
  return pricingModeLabel[value as PricingMode] ?? 'Способ расчёта уточняется';
}

export function presentAvailability(value: string): string {
  return availabilityLabel[value as Availability] ?? 'Наличие уточняется';
}

const amigoMappingStatusLabels: Record<string, string> = {
  AMBIGUOUS_CALCULATOR_MATCH: 'Нужно уточнить связь с калькулятором',
  MISSING_CURRENT_FROM_PRICE: 'Нет текущей карточной цены',
  NO_CALCULATOR_MATCH: 'Нет подтверждённой связи с калькулятором',
  READY: 'Готов к точному расчёту',
};

export function presentAmigoMappingStatus(value: string | null | undefined): string {
  if (!value) return 'Не сопоставлен';
  return amigoMappingStatusLabels[value] ?? 'Требуется проверка сопоставления';
}

const requestStatusLabels: Record<string, string> = {
  CANCELLED: 'Отменена',
  COMPLETED: 'Завершена',
  CONTACTED: 'Связались с клиентом',
  IN_REVIEW: 'На рассмотрении',
  NEW: 'Новая',
};

const aiStatusLabels: Record<string, string> = {
  CREATED: 'Проект создан',
  DELETED: 'Удалено',
  EXPIRED: 'Срок хранения истёк',
  FAILED: 'Не удалось обработать',
  PROCESSING: 'Создаём результат',
  READY: 'Фото готово к обработке',
  REJECTED: 'Обработка отклонена',
  SUCCEEDED: 'Результат готов',
  UPLOAD_PENDING: 'Ожидаем фото',
};

export function presentRequestStatus(value: string): string {
  return requestStatusLabels[value] ?? 'Статус уточняется';
}

export function presentAiStatus(value: string): string {
  return aiStatusLabels[value] ?? 'Состояние обновляется';
}

const blindFamilyLabels: Record<BlindFamily, string> = {
  HORIZONTAL: 'Горизонтальные жалюзи',
  ROLLER: 'Рулонные шторы',
  VERTICAL: 'Вертикальные жалюзи',
  ZEBRA: 'Зебра / День-Ночь',
};

const aiErrorLabels: Record<AiVisualizationErrorCode, string> = {
  AI_DISABLED: 'Функция выключена',
  CONSENT_REQUIRED: 'Нет согласия на обработку',
  DAILY_LIMIT_REACHED: 'Дневной лимит исчерпан',
  IMAGE_TOO_LARGE: 'Изображение слишком большое',
  IMAGE_TOO_SMALL: 'Изображение слишком маленькое',
  INTERNAL_ERROR: 'Внутренняя ошибка',
  INVALID_IMAGE: 'Некорректное изображение',
  JOB_ALREADY_RUNNING: 'Обработка уже выполняется',
  JOB_EXPIRED: 'Срок хранения истёк',
  MATERIAL_IMAGE_UNAVAILABLE: 'Изображение материала недоступно',
  MATERIAL_NOT_FOUND: 'Материал не найден',
  OUTPUT_INVALID: 'Результат не прошёл проверку',
  PROVIDER_RATE_LIMITED: 'Сервис ограничил частоту запросов',
  PROVIDER_REJECTED: 'Сервис отклонил обработку',
  PROVIDER_UNAVAILABLE: 'Сервис временно недоступен',
  RATE_LIMITED: 'Слишком много одновременных запросов',
  STORAGE_UNAVAILABLE: 'Хранилище временно недоступно',
  UNSUPPORTED_IMAGE_TYPE: 'Формат изображения не поддерживается',
};

const providerErrorLabels: Record<PolzaProviderErrorCode, string> = {
  POLZA_AUTH_ERROR: 'Не удалось подтвердить доступ к сервису',
  POLZA_BALANCE_ERROR: 'Нужно проверить баланс сервиса',
  POLZA_INVALID_REQUEST: 'Сервис не принял параметры запроса',
  POLZA_MODEL_UNAVAILABLE: 'Модель временно недоступна',
  POLZA_OUTPUT_INVALID: 'Ответ сервиса не прошёл проверку',
  POLZA_PROVIDER_ERROR: 'Ошибка внешнего сервиса',
  POLZA_RATE_LIMITED: 'Внешний сервис ограничил частоту запросов',
  POLZA_TIMEOUT: 'Внешний сервис не ответил вовремя',
};

const auditActionLabels: Record<string, string> = {
  AI_JOB_DELETED: 'Удалена AI-визуализация',
  AI_JOB_IMAGE_VIEWED: 'Открыт временный просмотр изображения',
  AI_SETTINGS_UPDATED: 'Изменены настройки AI-визуализации',
  AI_VISUALIZATION_CLEANUP: 'Запущена очистка просроченных файлов',
  CATEGORY_CREATED: 'Создана категория',
  CATEGORY_UPDATED: 'Изменена категория',
  MATERIAL_UPDATED: 'Изменён материал',
  ORDER_UPDATED: 'Обновлена заявка',
  PORTFOLIO_CREATED: 'Добавлена работа в портфолио',
  PORTFOLIO_UPDATED: 'Изменена работа в портфолио',
  SITE_SETTINGS_UPDATED: 'Изменены настройки сайта',
  STAFF_CREATED: 'Создан сотрудник',
  STAFF_UPDATED: 'Изменён доступ сотрудника',
};

export function presentBlindFamily(value: string): string {
  return blindFamilyLabels[value as BlindFamily] ?? 'Тип жалюзи уточняется';
}

export function presentAiError(value: string | null | undefined): string | null {
  if (!value) return null;
  return aiErrorLabels[value as AiVisualizationErrorCode] ?? 'Ошибка обработки';
}

export function presentProviderError(value: string | null | undefined): string | null {
  if (!value) return null;
  return providerErrorLabels[value as PolzaProviderErrorCode] ?? 'Ошибка внешнего сервиса';
}

export function presentAdminAuditAction(value: string): string {
  return auditActionLabels[value] ?? 'Рабочее действие';
}

export function formatRubles(kopecks: number | null | undefined): string {
  if (kopecks == null) return 'Цена не была сохранена';
  return new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(kopecks / 100);
}
