import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../../..');

async function source(path: string): Promise<string> {
  return readFile(resolve(repositoryRoot, path), 'utf8');
}

describe('Phase 2B storage, RLS and security contracts', () => {
  it('creates private AI buckets with no guest object policies', async () => {
    const migration = await source('supabase/migrations/20260812190000_phase_2b_ai_visualization.sql');
    expect(migration).toMatch(/\('ai-inputs',\s*'ai-inputs',\s*false/gu);
    expect(migration).toMatch(/\('ai-results',\s*'ai-results',\s*false/gu);
    expect(migration).toContain('alter table public.ai_visualization_jobs enable row level security');
    expect(migration).toContain('from public, anon, authenticated');
    expect(migration).not.toMatch(/create policy[^;]+ai-inputs/giu);
    expect(migration).not.toMatch(/create policy[^;]+ai-results/giu);
  });

  it('enforces atomic idempotency, daily/concurrency limits and immutable attempt history', async () => {
    const migration = await source('supabase/migrations/20260812190000_phase_2b_ai_visualization.sql');
    expect(migration).toContain('unique (guest_session_hash, idempotency_hash)');
    expect(migration).toContain('ai_jobs_one_active_guest_idx');
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('GUEST_DAILY_LIMIT');
    expect(migration).toContain('GLOBAL_DAILY_LIMIT');
    expect(migration).toContain('CONCURRENCY_LIMIT');
    expect(migration).toContain('IDEMPOTENT');
    expect(migration).toContain('REUSED');
    expect(migration).not.toMatch(/grant\s+(?:update|delete)[^;]+ai_visualization_attempts[^;]+authenticated/giu);
  });

  it('uses direct signed upload and does not accept a browser image body in a Vercel route', async () => {
    const client = await source('apps/web/lib/ai-visualization/client-image.ts');
    const uploadRoute = await source(
      'apps/web/app/api/ai-visualizations/[publicReference]/upload/route.ts',
    );
    const confirmRoute = await source(
      'apps/web/app/api/ai-visualizations/[publicReference]/upload/confirm/route.ts',
    );
    expect(client).toContain('uploadToSignedUrl');
    expect(uploadRoute).toContain('createSignedUploadUrl');
    expect(uploadRoute).toContain('upsert: false');
    expect(`${uploadRoute}\n${confirmRoute}`).not.toMatch(/request\.(?:formData|arrayBuffer|blob)\(/u);
    expect(confirmRoute).toContain('.download(job.input_storage_path)');
  });

  it('keeps Polza and service-role secrets in server-only modules and out of client code', async () => {
    const client = await source('apps/web/app/visualizer/visualizer-flow.tsx');
    const browserImage = await source('apps/web/lib/ai-visualization/client-image.ts');
    const provider = await source('apps/web/lib/ai-visualization/polza-provider.ts');
    const packageJson = await source('apps/web/package.json');
    expect(`${client}\n${browserImage}`).not.toMatch(/POLZA_AI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|Bearer /u);
    expect(provider).toContain('Authorization: `Bearer ${this.#apiKey}`');
    expect(packageJson).not.toContain(['@google', 'genai'].join('/'));
    expect(await source('.env.example')).not.toMatch(/^GEMINI_(?:API_KEY|IMAGE_MODEL)=/mu);
  });

  it('copies provider output to private Supabase storage and returns only signed metadata URLs', async () => {
    const lifecycle = await source('apps/web/lib/ai-visualization/lifecycle.ts');
    const resultRoute = await source(
      'apps/web/app/api/ai-visualizations/[publicReference]/result/route.ts',
    );
    expect(lifecycle).toContain("from(input.config.resultBucket).upload");
    expect(lifecycle).toContain('downloadPolzaResult');
    expect(lifecycle).toContain('createSignedUrl(job.result_storage_path, 300)');
    expect(resultRoute).not.toMatch(/base64|provider_request_id|providerStatus/iu);
  });

  it('prevents SSRF and protects cron', async () => {
    const fetcher = await source('apps/web/lib/ai-visualization/result-fetch.ts');
    const cron = await source('apps/web/app/api/internal/ai-cleanup/route.ts');
    expect(fetcher).toContain("hostname !== 'polza.ai'");
    expect(fetcher).toContain("url.protocol !== 'https:'");
    expect(fetcher).toContain('isPrivateAddress');
    expect(cron).toContain("process.env['CRON_SECRET']");
    expect(cron).toContain('timingSafeEqual');
  });

  it('links cart and order by project reference without affecting price fields', async () => {
    const schema = await source('apps/web/lib/phase2a/schemas.ts');
    const migration = await source('supabase/migrations/20260812190000_phase_2b_ai_visualization.sql');
    expect(schema).toContain('aiVisualizationPublicReference');
    expect(migration).toContain('ai_visualization_job_id');
    expect(migration).toContain('and j.material_id = v_material.id');
    expect(migration).toContain('and j.guest_session_hash = v_guest_session_hash');
    expect(await source('apps/web/lib/phase2a/pricing.ts')).not.toContain(
      'aiVisualizationPublicReference',
    );
  });
});
