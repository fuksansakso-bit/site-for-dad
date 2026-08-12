# Phase 2B Polza AI visualization evaluation PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Implementation complete; one live Zebra technical/visual case passed; multi-family matrix pending |
| Версия | 0.5.0 |
| Дата | 2026-08-13 |
| Provider/model | Polza AI / `google/gemini-3.1-flash-image` through Media API |
| Prompt | `window-blinds-polza-v1` |

## 1. Decision and evidence boundary

This evaluation determines whether the bounded Phase 2B Polza result is usable as an approximate sales aid. It does not prove measurements, installation feasibility, physical color, room invariants, provider privacy claims or commercial production readiness. Mock output verifies only software lifecycle/security and is never live quality evidence.

- **AIEVAL-017 — MUST:** live images are rights-cleared synthetic/business-approved window photos and approved catalog material images; personal/production customer photos are forbidden.
- **AIEVAL-018 — MUST:** at most `AI_LIVE_TEST_LIMIT` and never more than three paid tasks are created for this gate; idempotent replays must not increase the count.
- **AIEVAL-019 — MUST:** target cases are roller, Zebra/Day-Night and one horizontal or vertical profile, including portrait and landscape when rights-cleared assets permit.
- **AIEVAL-020 — MUST:** each live case records provider job creation/ID, polling final state, observed model, valid downloaded image, private Supabase copy, loss of dependency on provider URL and idempotency result without recording URLs, prompts, keys or media bytes.
- **AIEVAL-021 — MUST:** visual review records room preservation, recognizable window/frame, correct family, approximate color/texture similarity, artifacts and disclosure; no absolute pass claim is inferred from file validity.
- **AIEVAL-022 — MUST:** security review confirms direct browser-to-Supabase input upload, private buckets, cross-session denial, result signed expiry, no client key/service role/prompt/provider response and successful delete/expiry.
- **AIEVAL-023 — MUST:** mobile review covers 320/360/375/390/430 px, touch before-after, camera/file input, stable progress, CTA reachability, no horizontal scroll and recoverable errors.
- **AIEVAL-024 — MUST:** provider auth/rate/balance/model/request/timeout/output errors are tested through fixtures and safe public mapping without intentionally spending live balance on failure cases.

## 2. Automated evidence

Required suites:

- prompt/family/aspect/hash/transition/error/retry/expiration/material validation units;
- mock adapter create/status/result and malformed/provider-failure contracts;
- job/create/upload-confirm/start/status/result/retry/delete/cleanup/cart/request/admin service integration with in-memory/fake ports;
- migration/static RLS assertions for private buckets, no guest listing/cross-object operations, admin data boundaries and protected cron;
- browser five-state flow and before-after/mobile tests with explicit test-only provider/storage fixtures;
- lint, typecheck, unit/integration/RLS/browser/security/secret scan, production build and Vercel configuration validation.

When credentials are absent, cloud RLS/storage/cron and live Polza tests are `NOT_RUN_NO_CREDENTIALS`; prepared tests and local mocks may pass but cannot be relabelled live. The 2026-08-13 execution used the configured cloud Supabase project and paid Polza account for one rights-cleared Zebra case and is recorded separately from the still-incomplete family matrix.

## 3. Live review record

The execution record is [AI_VISUALIZATION_LIVE_QA.md](../06-plans/AI_VISUALIZATION_LIVE_QA.md). It records exact call count, safe case IDs, pass/fail observations, skipped reasons and final status.

## 4. Acceptance

- `IMPLEMENTATION_COMPLETE_POLZA_LIVE_PROVIDER_PENDING`: code, migration, mocks, static security/browser/build evidence complete; no Polza key or cloud evidence.
- `PASSED_PHASE_2B_POLZA_GEMINI_VISUALIZATION`: all implementation evidence plus bounded Polza create/poll/result-import/idempotency and rights-cleared visual review pass.

Neither status authorizes production launch or Phase 2C. Quality regression, Polza contract/model changes, prompt changes, new family behavior, retention change or repeated room/material drift require re-evaluation and possibly a superseding ADR.
