# Polza AI window visualization pipeline PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 2B implementation contract; live Zebra pipeline passed; remaining family-quality cases pending |
| Версия | 0.4.0 |
| Дата | 2026-08-13 |
| Product behavior | [AI_WINDOW_VISUALIZER_SPEC.md](../02-domain/AI_WINDOW_VISUALIZER_SPEC.md) |
| ADR | [ADR-0014](../../adr/ADR-0014-polza-ai-window-visualization.md) |

## 1. Runtime topology

```text
Browser canvas preparation
  -> Next create/signed-upload metadata routes
  -> Browser -> private Supabase ai-inputs (signed token)
  -> Next confirmation -> Supabase validate/hash
  -> Next start -> PolzaImageVisualizationProvider POST /media
  -> Browser polls our status route
  -> Next status -> Polza GET /media/{id}
  -> Next validates/downloads completed data.url
  -> private Supabase ai-results
  -> owned short-lived Supabase signed read URL
```

One Next.js Node runtime owns orchestration. There is no Google SDK, AI worker, callback service, queue daemon, Python/GPU stage, detector, segmenter, mask or geometry renderer.

## 2. Provider port

```ts
interface ImageVisualizationProvider {
  createJob(input: ProviderCreateInput): Promise<ProviderCreatedJob>;
  getJobStatus(providerJobId: string): Promise<ProviderJobState>;
  getResult(state: ProviderSucceededState): Promise<ProviderResultLocator>;
  healthCheck(): Promise<ProviderHealth>;
}
```

`PolzaImageVisualizationProvider` is the only production implementation. A deterministic `MockImageVisualizationProvider` is constructed directly by tests; any development switch is explicit and rejected in production.

- **AI-PIPE-021 — MUST:** adapter base URL is parsed from `POLZA_AI_BASE_URL`, defaults to `https://polza.ai/api/v1`, requires HTTPS outside loopback test, strips trailing slash and never accepts a request-supplied host/path.
- **AI-PIPE-022 — MUST:** create sends official Media API JSON: `model`, `input.prompt`, ordered `input.images` entries `{type:"url",data}`, `input.aspect_ratio`, `input.max_images:1`, `async:true`, and a pseudonymous `user`; only model-documented fields are added.
- **AI-PIPE-023 — MUST:** model comes only from `POLZA_AI_IMAGE_MODEL` with default `google/gemini-3.1-flash-image`; domain/client/admin do not hardcode or change it.
- **AI-PIPE-024 — MUST:** source images are five-minute Supabase signed URLs ordered window first, exact material second. The adapter receives no service-role key, storage credential, contacts, order/staff data or internal UUID.
- **AI-PIPE-025 — MUST:** prompt is built in a `server-only` module from validated server material fields, confirmed dimensions when present and a family allowlist; it is never serialized to a DTO or audit/log.

## 3. Polza response mapping

| Polza status | Domain result |
|---|---|
| `pending`, `processing` | `PROCESSING` |
| `completed` with valid `data.url` | import result, then `SUCCEEDED` |
| `failed` safety/input rejection | `REJECTED` |
| `failed` transient/provider/auth/balance/model error | `FAILED` with normalized staff diagnostic |
| `cancelled` | `FAILED` |
| missing/unknown/malformed | `FAILED / POLZA_OUTPUT_INVALID` |

- **AI-PIPE-026 — MUST:** POST stores returned `id`, observed model and safe status metadata before returning; a 200 response without a bounded valid ID is invalid.
- **AI-PIPE-027 — MUST:** provider IDs match a conservative opaque allowlist before use in path construction; raw JSON, warnings, reasoning, content, usage/cost and provider message are not persisted wholesale.
- **AI-PIPE-028 — MUST:** per-call abort timeout is bounded; auth maps to `POLZA_AUTH_ERROR`, 429 to `POLZA_RATE_LIMITED`, balance-like documented error codes to `POLZA_BALANCE_ERROR`, model unavailable to `POLZA_MODEL_UNAVAILABLE`, 4xx request/safety to `POLZA_INVALID_REQUEST`, 5xx/network to `POLZA_PROVIDER_ERROR`/`POLZA_TIMEOUT`.
- **AI-PIPE-029 — MUST:** public mapping collapses diagnostics to `PROVIDER_UNAVAILABLE`, `PROVIDER_RATE_LIMITED`, `PROVIDER_REJECTED` or `OUTPUT_INVALID`; raw balance/account details stay private.

## 4. Prompt and output profile

The base prompt starts: “You are a professional architectural image editing engine.” Image 1 is the original room/window, image 2 the exact selected material. It demands edit-image-1-only, preserves camera/perspective/window/frame/handles/sill/room/furniture/lighting/people/orientation, forbids new objects/text/logos/watermarks and asks for one photorealistic installed result.

Family suffixes require: flat plausible roller and bottom bar; alternating parallel translucent/opaque Zebra bands; horizontal slats; or equally spaced vertical slats. Only validated name/article/color/family and confirmed product values are interpolated. Prompt version is `window-blinds-polza-v1`.

Aspect mapping uses nearest supported `1:1`, `9:16` or `16:9` based on decoded source dimensions. The stable selected model's documented 1K-class output is requested through aspect/max-image fields; `AI_OUTPUT_SIZE` accepts only `1K` in Phase 2B and is included in hashing/metadata.

## 5. Job transitions and concurrency

Allowed transitions:

```text
CREATED -> UPLOAD_PENDING -> READY -> PROCESSING -> SUCCEEDED
                                       |          -> FAILED / REJECTED
non-active terminal or ready -> EXPIRED / DELETED
FAILED/REJECTED -> explicit new attempt -> PROCESSING
```

- **AI-PIPE-030 — MUST:** database updates use compare-and-set status predicates; only one route wins provider creation or result import.
- **AI-PIPE-031 — MUST:** attempts have unique hashed idempotency keys, immutable provider IDs/timestamps/status/error, and increment `attempt_number`; replay returns the attempt without POST.
- **AI-PIPE-032 — MUST:** daily and concurrency counts are database queries/RPC checks in the same transaction as reservation; in-memory maps are only an extra local throttle.
- **AI-PIPE-033 — MUST:** status polling calls Polza at most once per three seconds per job, never creates a provider task, stops at a terminal state and limits client polling duration.
- **AI-PIPE-034 — MUST:** one transient retry may repeat the same provider transport operation only when the first attempt cannot have returned a usable provider ID; ambiguous POST outcomes fail closed for manual reconciliation rather than double spend.

## 6. Result import safety

- **AI-PIPE-035 — MUST:** only an HTTPS `data.url` originating in an authenticated completed Polza response is accepted; DNS resolution/private/reserved IP, credentials, non-default ports, excessive redirects and protocol changes are denied.
- **AI-PIPE-036 — MUST:** result fetch uses manual bounded redirects, abort timeout, declared and streamed byte limits, image MIME/magic checks and no forwarded Polza/Supabase authorization.
- **AI-PIPE-037 — MUST:** `sharp` decodes with `failOn:warning` and `limitInputPixels`, auto-orients, strips metadata and normalizes to JPEG/PNG within output limits before SHA-256 and immutable `upsert:false` upload.
- **AI-PIPE-038 — MUST:** storage succeeds before job `SUCCEEDED`; missing image/text-only/malformed output is `POLZA_OUTPUT_INVALID`/`OUTPUT_INVALID`, and Base64/provider URL is not returned.

## 7. Storage and cleanup

`ai-inputs` and `ai-results` are private buckets with image-only MIME/size limits and no anon/authenticated object-list/read/write policies. Service role operates only in server modules after ownership/permission checks; signed upload is exact-path and non-upsert.

Daily `/api/internal/ai-cleanup` requires constant-time `Authorization: Bearer <CRON_SECRET>`, processes a bounded expired batch, skips `PROCESSING`, attempts input/result deletion independently, records safe audit counts and marks only fully handled jobs `EXPIRED`/`DELETED`. OWNER/ADMIN uses the same service through an authorized route/action.

## 8. Observability and secrets

- **AI-PIPE-039 — MUST:** correlation ID, job reference hash, state, latency class, provider diagnostic code and attempt count are allowed; bytes/Base64, prompt, signed/provider URLs, paths, filenames, raw IP/contact, headers/tokens and response bodies are forbidden.
- **AI-PIPE-040 — MUST:** `POLZA_AI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are imported only by `server-only` modules and secret scans inspect source and `.next/static`; no `NEXT_PUBLIC_` aliases exist.
- **AI-PIPE-041 — MUST:** health reports only configured/enabled/reachable classes, never keys, provider balance or raw errors.

## 9. Recovery

Interrupted upload remains `UPLOAD_PENDING` until expiry. Signed-upload confirmation MUST tolerate the short interval in which a successful private Storage write is not yet readable: both the browser confirmation request and the server-side object read use bounded idempotent retries before exposing a safe storage error. Browser closure during processing is recovered by owned status polling. Supabase/provider temporary failure produces a safe retryable terminal state. Result-storage failure never marks success. Deleted/expired jobs deny all read/retry grants. Cleanup partial failure is retried on the next bounded run.

Polza completed media responses are accepted only when exactly one HTTPS result URL is present, whether the provider returns the documented `data.url` object or the observed single-item `data[0].url` array. Any empty, multi-item or malformed result remains fail-closed as `OUTPUT_INVALID`.
