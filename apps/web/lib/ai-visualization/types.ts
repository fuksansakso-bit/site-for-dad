export const AI_VISUALIZATION_STATUSES = [
  'CREATED',
  'UPLOAD_PENDING',
  'READY',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'REJECTED',
  'EXPIRED',
  'DELETED',
] as const;

export type AiVisualizationStatus = (typeof AI_VISUALIZATION_STATUSES)[number];

export const AI_VISUALIZATION_FINAL_STATUSES = [
  'SUCCEEDED',
  'FAILED',
  'REJECTED',
  'EXPIRED',
  'DELETED',
] as const satisfies readonly AiVisualizationStatus[];

export const AI_VISUALIZATION_ERROR_CODES = [
  'AI_DISABLED',
  'INVALID_IMAGE',
  'IMAGE_TOO_LARGE',
  'IMAGE_TOO_SMALL',
  'UNSUPPORTED_IMAGE_TYPE',
  'MATERIAL_NOT_FOUND',
  'MATERIAL_IMAGE_UNAVAILABLE',
  'CONSENT_REQUIRED',
  'RATE_LIMITED',
  'DAILY_LIMIT_REACHED',
  'JOB_ALREADY_RUNNING',
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_RATE_LIMITED',
  'PROVIDER_REJECTED',
  'OUTPUT_INVALID',
  'STORAGE_UNAVAILABLE',
  'JOB_EXPIRED',
  'INTERNAL_ERROR',
] as const;

export type AiVisualizationErrorCode = (typeof AI_VISUALIZATION_ERROR_CODES)[number];

export const POLZA_PROVIDER_ERROR_CODES = [
  'POLZA_AUTH_ERROR',
  'POLZA_RATE_LIMITED',
  'POLZA_BALANCE_ERROR',
  'POLZA_MODEL_UNAVAILABLE',
  'POLZA_INVALID_REQUEST',
  'POLZA_PROVIDER_ERROR',
  'POLZA_TIMEOUT',
  'POLZA_OUTPUT_INVALID',
] as const;

export type PolzaProviderErrorCode = (typeof POLZA_PROVIDER_ERROR_CODES)[number];

export type BlindFamily = 'ROLLER' | 'ZEBRA' | 'HORIZONTAL' | 'VERTICAL';
export type SupportedImageMime = 'image/jpeg' | 'image/png' | 'image/webp';
export type SupportedAspectRatio = '1:1' | '9:16' | '16:9';

export type AiVisualizationJobRow = {
  id: string;
  public_reference: string;
  guest_session_hash: string;
  ip_hash: string | null;
  material_id: string;
  input_storage_path: string;
  result_storage_path: string | null;
  input_sha256: string | null;
  material_image_sha256: string | null;
  combined_request_hash: string | null;
  result_sha256: string | null;
  create_idempotency_hash: string | null;
  upload_idempotency_hash: string | null;
  status: AiVisualizationStatus;
  model_name: string;
  prompt_version: string;
  output_size: '1K';
  output_aspect_ratio: SupportedAspectRatio | null;
  attempt_number: number;
  error_code: string | null;
  safe_error_message: string | null;
  provider_request_id: string | null;
  provider_status: string | null;
  provider_error_code: PolzaProviderErrorCode | null;
  input_mime_type: SupportedImageMime | null;
  input_byte_size: number | null;
  input_width: number | null;
  input_height: number | null;
  material_image_mime_type: SupportedImageMime | null;
  material_image_byte_size: number | null;
  result_mime_type: SupportedImageMime | null;
  result_byte_size: number | null;
  consent_version: string | null;
  last_provider_poll_at: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string;
  deleted_at: string | null;
  updated_at: string;
};

export type SafeMaterialReference = {
  id: string;
  slug: string;
  name: string;
  article: string;
  color: string | null;
  family: BlindFamily;
  categoryName: string;
  availability: 'AVAILABLE' | 'OUT_OF_STOCK' | 'INQUIRY_ONLY';
  imageUrl: string;
};

export type SafeAiVisualizationJob = {
  publicReference: string;
  status: AiVisualizationStatus;
  attemptNumber: number;
  expiresAt: string;
  errorCode: AiVisualizationErrorCode | null;
  errorMessage: string | null;
  material: Omit<SafeMaterialReference, 'id'>;
  reused: boolean;
};

export type ApiErrorPayload = {
  error: {
    code: AiVisualizationErrorCode;
    message: string;
    retryable: boolean;
    correlationId: string;
  };
};
