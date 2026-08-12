# AI visualization live QA

## Current result — 2026-08-13

- **Technical live path:** `PASSED` for one rights-cleared Zebra / Day-Night case.
- **Provider/model:** Polza AI Media API / `google/gemini-3.1-flash-image`.
- **Prompt version:** `window-blinds-polza-v1`.
- **Formal Phase 2B status:** `IMPLEMENTATION_COMPLETE_POLZA_LIVE_PROVIDER_PENDING` remains until the multi-family live quality matrix in `AIEVAL-019` is complete. This label no longer means that provider connectivity or result import is untested.
- **Production:** not authorized. Provider/legal/privacy/region, restore and complete family-quality gates remain open.

## Successful live case

`LIVE-QA-20260813-02` used the registered partner-licensed, non-personal kitchen window scene and the published Zebra material `amigo-material-12114`. The owner explicitly authorized paid requests after topping up the Polza account.

The complete real path passed:

1. The browser normalized the source to a 1,500×937 JPEG, removed metadata and sent the bytes directly to the private Supabase `ai-inputs` bucket through an exact non-upsert signed upload.
2. Server confirmation downloaded and validated the private object; Vercel/Next.js received metadata only.
3. The server reserved one attempt, generated the closed family prompt and sent the window plus exact material reference to Polza.
4. Polza created an asynchronous job, returned the configured Gemini model and reached `completed` through bounded polling.
5. The server accepted exactly one HTTPS result, downloaded and normalized it, and copied a 142,600-byte JPEG into private `ai-results`.
6. The owned result endpoint issued short-lived Supabase URLs and the browser rendered a complete 1,500×937 before/after comparison.
7. Visual review found the original room and window recognizable, the white Zebra family visible on the window, the comparison control usable and the approximate-result disclosure visible. No claim of dimensional, color or installation accuracy is made.
8. Owned deletion returned `204`; both job folders then contained zero private input/result objects.

## Defects found and corrected by live QA

- A successful signed upload could be briefly unreadable during immediate confirmation. The browser now retries only the idempotent confirmation request and the server performs a bounded Storage-visibility retry before returning a safe outage.
- Deleting an interrupted `UPLOAD_PENDING` job no longer invents `completed_at`, preserving the database time-order constraint.
- Polza's actual completed response used a single-item `data[0].url` array while the documented example also permits `data.url`. The adapter now accepts either exact single-result shape and continues to reject empty, multiple or malformed results.

## Paid execution and safe diagnostics

- Two paid Polza jobs were created after the owner's authorization. The first completed at Polza but exposed the result-array compatibility defect; the second completed and passed private import/UI/delete.
- Costs reported by Polza were 7.84402510 ₽ and 7.86529874 ₽, total **15.70932384 ₽**. The post-run balance endpoint reported 84.97122006 ₽.
- Earlier non-result checks exposed one provider network error, one upload-confirmation visibility race and one pre-top-up `HTTP 402`; none is represented as successful output.
- No API key, prompt, signed URL, object path, full provider job ID, private media byte or raw provider response is recorded in repository evidence.

## Automated and local evidence

- Polza object and single-item-array result contracts, signed-upload visibility retry and interrupted-upload deletion are covered by unit tests.
- The post-fix suite passes 55/55 Vitest tests, ESLint, strict TypeScript and the Next.js 16.2.12 production build on Node 24.19.0 / pnpm 11.18.0; the pinned Node version remains 24.18.1.
- The existing mock browser suite remains useful for deterministic responsive, retry, cart and delete coverage, but it is not counted as live provider evidence.

## Remaining live-quality work

The successful Zebra case proves that the public feature is a real Supabase → Polza/Gemini → private-result implementation rather than a placeholder. A formal `PASSED_PHASE_2B_POLZA_GEMINI_VISUALIZATION` claim still requires the remaining roller and horizontal-or-vertical rights-cleared quality cases under the bounded evaluation policy. That additional benchmark is not required to ship the present Draft Preview, and it does not authorize production by itself.
