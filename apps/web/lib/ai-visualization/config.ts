import 'server-only';

const DEFAULT_POLZA_BASE_URL = 'https://polza.ai/api/v1';
const DEFAULT_POLZA_MODEL = 'google/gemini-3.1-flash-image';

export const AI_VISUALIZATION_PROMPT_VERSION = 'window-blinds-polza-v1';
export const AI_VISUALIZATION_CONSENT_VERSION = 'polza-photo-processing-v1';

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

function bucketName(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized?.match(/^[a-z0-9][a-z0-9-]{1,62}$/u) ? normalized : fallback;
}

function safeBaseUrl(value: string | undefined): string {
  try {
    const url = new URL(value?.trim() || DEFAULT_POLZA_BASE_URL);
    if (url.protocol !== 'https:') return DEFAULT_POLZA_BASE_URL;
    return url.toString().replace(/\/$/u, '');
  } catch {
    return DEFAULT_POLZA_BASE_URL;
  }
}

function safeModelName(value: string | undefined): string {
  const normalized = value?.trim();
  return normalized?.match(/^[A-Za-z0-9][A-Za-z0-9._/-]{2,199}$/u)
    ? normalized
    : DEFAULT_POLZA_MODEL;
}

export type AiVisualizerServerConfig = {
  polzaApiKey: string | null;
  polzaBaseUrl: string;
  modelName: string;
  environmentEnabled: boolean;
  mockProviderEnabled: boolean;
  effectiveProviderAvailable: boolean;
  maxAttemptsPerGuestPerDay: number;
  globalDailyJobLimit: number;
  maxConcurrentJobs: number;
  outputSize: '1K';
  retentionHours: number;
  liveTestLimit: number;
  inputBucket: string;
  resultBucket: string;
};

export function getAiVisualizerServerConfig(): AiVisualizerServerConfig {
  const polzaApiKey = process.env['POLZA_AI_API_KEY']?.trim() || null;
  const modelName = safeModelName(process.env['POLZA_AI_IMAGE_MODEL']);
  const environmentEnabled = process.env['AI_VISUALIZER_ENABLED'] === 'true';
  const mockProviderEnabled =
    process.env['NODE_ENV'] !== 'production' &&
    process.env['AI_VISUALIZER_MOCK_PROVIDER'] === 'true';

  return {
    polzaApiKey,
    polzaBaseUrl: safeBaseUrl(process.env['POLZA_AI_BASE_URL']),
    modelName,
    environmentEnabled,
    mockProviderEnabled,
    effectiveProviderAvailable:
      environmentEnabled && (polzaApiKey !== null || mockProviderEnabled),
    maxAttemptsPerGuestPerDay: boundedInteger(
      process.env['AI_MAX_ATTEMPTS_PER_GUEST_PER_DAY'],
      2,
      1,
      20,
    ),
    globalDailyJobLimit: boundedInteger(
      process.env['AI_GLOBAL_DAILY_JOB_LIMIT'],
      20,
      1,
      1_000,
    ),
    maxConcurrentJobs: boundedInteger(process.env['AI_MAX_CONCURRENT_JOBS'], 1, 1, 20),
    outputSize: '1K',
    retentionHours: boundedInteger(process.env['AI_RETENTION_HOURS'], 24, 1, 168),
    liveTestLimit: boundedInteger(process.env['AI_LIVE_TEST_LIMIT'], 3, 1, 3),
    inputBucket: bucketName(process.env['SUPABASE_AI_INPUTS_BUCKET'], 'ai-inputs'),
    resultBucket: bucketName(process.env['SUPABASE_AI_RESULTS_BUCKET'], 'ai-results'),
  };
}
