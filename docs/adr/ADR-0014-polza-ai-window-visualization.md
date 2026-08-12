# ADR-0014: Polza AI window visualization runtime

- **Status:** Accepted
- **Date:** 2026-08-12
- **Decision owners:** Product Owner; Business Owner for publication and catalog authority
- **Supersedes:** active AI-runtime portions of ADR-0005; the Phase 2A AI hold in ADR-0013 only for Phase 2B
- **Related:** `OWNER-DECISION-023`, `P2B-AI-*`, `NFR-PRIV-*`, `NFR-SEC-*`

## Context

Phase 2A provides one Next.js App Router application, Supabase PostgreSQL, Supabase Storage and staff-only Supabase Auth. Phase 2B needs a guest-only approximate blind visualization on a customer window photograph without restoring the former geometry/SAM/worker topology. The Product Owner replaced the proposed direct Google Gemini integration with Polza AI Media API.

Official Polza documentation verified on 2026-08-12 defines `POST /api/v1/media`, `GET /api/v1/media/{id}`, `images` entries with `{ type: "url" | "base64", data }`, asynchronous provider states and a completed `data.url`. The selected model registry ID is `google/gemini-3.1-flash-image`.

## Drivers

- keep credentials and the preservation prompt outside the browser;
- preserve the single Vercel-compatible Next.js runtime;
- upload phone photos directly to private Supabase Storage;
- bound paid calls and prevent replay/double spend;
- make provider retention irrelevant after result import;
- keep customer photos private, temporary and guest-owned;
- avoid segmentation, Python, GPU and a separate worker/service.

## Options considered

1. Direct Google Gemini Developer API and Google SDK — rejected by the Product Owner.
2. Polza Media API through server-side `fetch` — selected.
3. Restore geometry-first SAM/Python worker — rejected for Phase 2B complexity and scope.
4. Synchronous generation inside one long Vercel request — rejected because provider work is asynchronous and must be resumable.

## Decision

The domain uses a small `ImageVisualizationProvider` port with `createJob`, `getJobStatus`, `getResult` and `healthCheck`. `PolzaImageVisualizationProvider` alone knows endpoints, Bearer authorization, request JSON and provider statuses. It uses `POLZA_AI_API_KEY`, `POLZA_AI_BASE_URL` and `POLZA_AI_IMAGE_MODEL`; production never falls back to a mock.

The browser prepares and strips metadata from JPEG/PNG/WebP, obtains an exact-path signed upload token from a same-origin route and uploads directly to private `ai-inputs`. The server owns the storage path, re-downloads and validates bytes, hashes the input and exact catalog image, and supplies short-lived signed URLs to Polza in documented `images` entries. `async: true`, one result and nearest supported aspect ratio are requested. The closed prompt is versioned `window-blinds-polza-v1`.

Our job stores the provider ID and maps `pending`/`processing` to `PROCESSING`, `completed` to result import then `SUCCEEDED`, and `failed`/`cancelled` to safe terminal states. A controlled status route polls Polza no faster than the documented image interval, validates and downloads `data.url` with SSRF and size guards, then stores immutable bytes in private `ai-results`. Client reads use only short-lived Supabase signed URLs.

Database-backed rate events, one active job per guest, guest/day and global/day limits, concurrency limits, idempotency keys and a combined content hash protect spend. Inputs/results expire after 24 hours by default; an authenticated Vercel Cron route and OWNER/ADMIN action delete objects in batches. The order snapshot may retain only the safe visualization public reference; price is unchanged.

## Consequences

- provider output quality remains approximate and is disclosed;
- the client can resume status polling without recreating a paid task;
- a completed project result no longer depends on Polza's temporary CDN URL;
- no live claim is possible without a configured key and bounded live QA;
- provider contract/privacy/region questions still block unreviewed commercial launch.

## Risks and controls

- **Room/window drift:** strict preservation prompt, family instructions, before/after and live QA.
- **Spend abuse:** kill switch, limits, idempotency, hashes, single active job and bounded retry.
- **Photo disclosure:** private buckets, signed URLs, session ownership, no PII/provider prompt in logs, consent and cleanup.
- **Provider drift:** adapter parsing, safe unknown-status failure, contract tests and model/config in environment.
- **SSRF/result abuse:** provider ID validation, HTTPS-only bounded download, private-network denial, redirect and byte/MIME/decode limits.

## Rollback

Set the environment and database kill switches off, stop new signed uploads/provider calls, allow cleanup to remove temporary objects, and retain job/audit metadata. Existing catalog, calculator, cart and request flows remain functional. Replacing Polza later requires a superseding ADR and adapter, not a client-flow rewrite.
