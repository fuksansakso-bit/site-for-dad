import type { Availability, PricingMode, StaffRole } from './phase2a/types';

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
  AREA: 'По площади',
  FIXED: 'Фиксированная цена',
  MANUAL: 'По запросу',
};

export const availabilityLabel: Record<Availability, string> = {
  AVAILABLE: 'Доступно к заказу',
  INQUIRY_ONLY: 'Уточнить у менеджера',
  OUT_OF_STOCK: 'Временно недоступно',
};

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

export function formatRubles(kopecks: number | null | undefined): string {
  if (kopecks == null) return 'Стоимость уточнит менеджер';
  return new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(kopecks / 100);
}
