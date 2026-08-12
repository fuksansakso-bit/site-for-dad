# Phase 2B — Polza Gemini AI window visualization report

## Result

**Acceptance status:** `IMPLEMENTATION_COMPLETE_POLZA_LIVE_PROVIDER_PENDING`

**Date:** 2026-08-12

**Initial commit:** `49ce3679de28c612662f78273cd265d73221163d`

**Branch:** `phase/2b-gemini-ai-visualization`

**Draft PR:** [#7 — Phase 2B: Gemini AI window visualization](https://github.com/bataevabdullah2009-pixel/site-for-dad/pull/7)

The implementation, additive migration, mock/provider contract tests, responsive browser flow and production build are complete. `POLZA_AI_API_KEY`, Supabase cloud/service-role credentials and `CRON_SECRET` were not present, so no paid Polza call or remote bucket/RLS/cron claim was made.

## Commits

1. `a798df3 docs: authorize Phase 2B Gemini visualization`
2. `5596278 feat: add AI visualization data model and storage`
3. `beb320c feat: add secure direct image upload`
4. `0a73076 feat: add Polza image visualization provider`
5. `93bfe6d feat: add AI visualization job lifecycle`
6. `fa351f4 feat: add responsive AI visualization flow`
7. `4029b68 feat: integrate AI result with cart and requests`
8. `7f54aad feat: add AI limits cleanup and administration`
9. `6e69708 test: verify Gemini visualization security and flow`
10. `docs: complete Phase 2B Gemini visualization` (this report commit)

## Product and routes

1. Visualizer URL: `/visualizer?material=<published-material-slug>`.
2. Owned resumable URL: `/visualizer/<publicReference>`.
3. Entry points: catalog card, material page and calculator result.
4. Five states: selected material, photo, consent, generation and result.
5. Result actions: cart, another variant, another material, calculator and delete.
6. Public API: job create; signed upload; upload confirm; generate; status; photo/result grant; retry; delete.
7. Admin URL: `/admin/ai-visualizations`.
8. Internal cleanup: `/api/internal/ai-cleanup` with daily Vercel schedule.

## Storage and data

1. Private buckets: `ai-inputs`, `ai-results`.
2. Input key: `<job-id>/window.<ext>`; result key: `<job-id>/result.<ext>`.
3. Signed upload is exact-path, short-lived and non-upsert.
4. Browser photo bytes go directly to Supabase Storage; Vercel receives metadata only.
5. Signed reads are owned and five minutes; no public bucket or permanent public URL exists.
6. Job statuses: `CREATED`, `UPLOAD_PENDING`, `READY`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `REJECTED`, `EXPIRED`, `DELETED`.
7. Attempts are immutable; request/input/material hashes support deduplication and audit.
8. Database stores paths/hashes/safe metadata, never image Base64, prompt, key or raw provider body.
9. Optional order-item relation preserves business facts after AI media expires.

## Provider

1. Provider: Polza AI Media API through `PolzaImageVisualizationProvider`.
2. Create: `POST /media`; status: `GET /media/{id}` behind the provider port.
3. Model: environment-controlled `google/gemini-3.1-flash-image` default.
4. Prompt version: `window-blinds-polza-v1` in a server-only module.
5. Supported families: roller, Zebra/Day-Night, horizontal and vertical blinds.
6. Provider job ID is persisted and mapped to internal statuses.
7. Provider output is downloaded with SSRF/redirect/time/size/image checks and copied to `ai-results`.
8. Browser never receives the Polza response, temporary result URL, prompt, balance or diagnostics.
9. Polza auth/rate/balance/model/request/timeout/output errors normalize to safe client errors.
10. Direct Google API, Google SDK and `GEMINI_API_KEY` are absent.

## Limits, ownership and privacy

1. Feature is off by default and also fails closed without Polza/service-role configuration.
2. Defaults: two guest starts/day, one active job/guest, 20 global starts/day and one concurrent job.
3. Idempotency keys, atomic reservation and combined hash reuse prevent double paid jobs.
4. Upload/start limits cover guest and short-lived IP hash; raw IP is not retained.
5. One controlled transient retry is allowed for safe status/network failures; provider create is not duplicated.
6. Consent version: `polza-photo-processing-v1`; generation is blocked without consent.
7. Default output is one `1K` image; aspect ratio follows the nearest supported source ratio.
8. Default retention is 24 hours; owned delete removes input/result without deleting cart/order facts.
9. Cleanup is bounded, idempotent, skips active jobs and continues after individual object errors.
10. OWNER/ADMIN image grants are temporary and audited; MANAGER has aggregate-only access.

## Client image and UI verification

1. JPEG, PNG and WebP are accepted after magic/MIME/decode checks.
2. SVG, GIF, PDF, HEIC, HTML, mismatch, zero, oversized and decompression-risk images are rejected.
3. Browser decode/canvas normalization applies orientation, strips metadata and limits the long side to 2048 px and output to 4 MB.
4. Preview uses contained orientation and releases temporary Blob URLs.
5. Before/after is pointer/touch/keyboard usable and does not crop the image.
6. Immediate generation lock plus server idempotency rejects double click/replay.
7. Polling is finite, uses backoff, stops on terminal state/unmount and resumes an existing job after reload.
8. Playwright passed at 320, 360, 375, 390 and 430 px without horizontal overflow.
9. Cart linkage passed and pricing remains independent from the AI reference.
10. Request/WhatsApp flow preserves the safe summary and labels an expired visualization unavailable.

## Executed checks

- `pnpm --filter web test`: **49/49 passed**.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm phase-scope:check`: passed.
- `pnpm security:secrets`: passed across 575 repository files.
- `pnpm security:artifacts`: passed across 11,067 `.next` files using one hidden generated canary simultaneously injected as Polza, Supabase service-role and cron secret; no canary reached artifacts.
- `pnpm test:phase2b-browser`: **1/1 passed**, complete mock visualizer flow and five mobile widths.
- `pnpm build`: passed; Next.js generated all visualizer/admin/API/cron routes.
- Production build ran locally on Node 22.22.2 with the repository's Node 24 engine warning; baseline Node 24 build was already green and CI should re-run the final commit on Node 24.18.1.

## Explicitly skipped

- Live Polza generation: skipped because `POLZA_AI_API_KEY` is absent; live calls executed: **0**.
- Remote Supabase migration/private buckets/RLS pgTAP: skipped because cloud credentials are absent.
- Connected Supabase project verification: unavailable because the workspace Supabase connector reported that it is not connected; no project was guessed or mutated.
- Real cleanup/cron execution: skipped because remote Storage and `CRON_SECRET` are absent.
- Live visual quality for the four families: `Live visual QA pending`; mock imagery is not claimed as Polza output.

## Remaining manual actions

1. Review Draft PR #7 without merging automatically.
2. Run CI on required Node 24.18.1.
3. Apply the additive migration to the selected Supabase project and verify both buckets remain private.
4. Execute the committed pgTAP/cross-session Storage checks and one protected cleanup dry run.
5. Set server-only Polza/AI/bucket/cron environment values; keep the kill switch off until verification.
6. Run at most `AI_LIVE_TEST_LIMIT` rights-cleared Polza tasks and update `AI_VISUALIZATION_LIVE_QA.md`.
7. Complete provider legal/privacy/region/subprocessor decisions before production activation.

SAM, segmentation, masks, OpenCV, Python, PyTorch, GPU, a second backend/worker/service and customer accounts were not added. The final premium redesign and Phase 2C were not started.
