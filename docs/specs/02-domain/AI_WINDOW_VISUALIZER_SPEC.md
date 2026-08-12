# AI window visualizer specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 2B authorized by `OWNER-DECISION-023`; live Polza/Supabase evidence pending credentials |
| Версия | 0.3.0 |
| Дата | 2026-08-12 |
| Prompt version | `window-blinds-polza-v1` |
| Provider | Polza AI Media API; Gemini model through Polza |
| Technical pipeline | [AI_PIPELINE.md](../04-technical/AI_PIPELINE.md) |

## 1. Product boundary

Phase 2B adds one approximate AI-edited image of a selected blind material on a guest's own window photograph. It uses the existing Next.js/Supabase catalog, calculator, browser cart, request and staff administration. The result is illustrative, never a measurement, technical drawing, installation guarantee, price input or exact color proof.

The active flow is `Каталог → Материал → Примерить на своём окне → Фото → Согласие → Генерация → До/После → Корзина/Калькулятор → Заявка/WhatsApp`. No client account is required.

Out of scope: direct Google API/SDK, SAM, detection/segmentation, masks, four-corner/manual geometry, OpenCV, Python/PyTorch, training, GPU, a separate worker/service/backend, pane recognition, technical fitting, complex editor, 3D, final design and Phase 2C. If quality is inadequate, four-point markup is a future owner decision, not a Phase 2B fallback.

## 2. Material and entry validation

- **AIVIS-SPEC-024 — MUST:** catalog card, material page and calculator result expose «Примерить на своём окне» with a stable material slug/ID; the query string is only a lookup hint.
- **AIVIS-SPEC-025 — MUST:** before job creation the server re-reads `materials`/`categories`, requires both published, requires a non-empty exact `primary_image_path`, and derives name/article/color/type/family/image path itself.
- **AIVIS-SPEC-026 — MUST:** the material image is downloaded from the configured catalog bucket by a server credential, MIME/bytes/decode/hash checked and proven to be the selected material's own primary image; remote/client image URLs are rejected.
- **AIVIS-SPEC-027 — MUST:** roller, Zebra/Day-Night, horizontal and vertical family profiles are supported only when category/material metadata maps deterministically; an unsupported family fails safely without substitution.

## 3. Guest ownership and consent

- **AIVIS-SPEC-028 — MUST:** first API use creates/reuses a cryptographically random HttpOnly, SameSite, production-Secure guest cookie; only a keyed hash is stored with jobs.
- **AIVIS-SPEC-029 — MUST:** `public_reference` is at least 192 bits of unpredictable URL-safe entropy and is never sequential.
- **AIVIS-SPEC-030 — MUST:** read, result grant, retry and delete require the same guest-session hash; an opaque reference alone never transfers ownership and no guest list endpoint exists.
- **AIVIS-SPEC-031 — MUST:** generation requires an explicit unchecked-by-default consent: «Я согласен на обработку фотографии для создания визуализации.»
- **AIVIS-SPEC-032 — MUST:** before consent the UI states that the photo is temporarily stored, sent to Gemini through Polza AI, automatically deleted, and produces an approximate AI visualization. It makes no absolute privacy/provider-retention claim.

## 4. Client image preparation and direct upload

- **AIVIS-SPEC-033 — MUST:** accept only JPEG, PNG or WebP whose magic bytes match the declared type; reject SVG, GIF, PDF, HEIC/HEIF, HTML, unknown, empty and corrupt files.
- **AIVIS-SPEC-034 — MUST:** before upload the browser decodes with EXIF orientation, rejects unsafe dimensions/pixel count, draws to a clean canvas to remove EXIF/metadata, preserves portrait/landscape orientation, resizes the long side to at most 2048 px and produces at most 4 MiB.
- **AIVIS-SPEC-035 — MUST:** minimum decoded side is 320 px, maximum source pixels are 40 million and maximum original compressed bytes are 20 MiB; these are Phase 2B technical safety defaults and failures ask the user to choose another photograph.
- **AIVIS-SPEC-036 — MUST:** the browser requests a server-created exact-path signed upload token then sends bytes directly to Supabase Storage; no full input image appears in a Vercel request body or React Base64 state.
- **AIVIS-SPEC-037 — MUST:** the server owns `ai-inputs/<job-id>/window.<ext>`, uses no client filename/path, disallows upsert and confirms upload by re-downloading and validating actual size/MIME/magic/decode/hash before status `READY`.
- **AIVIS-SPEC-038 — MUST:** upload guidance says the full frame should be visible, photograph straight on with light, avoid people/obstructions/blur/crops/screenshots, and «Чем лучше видно окно, тем точнее будет AI-визуализация.»

## 5. Five UI states

1. Selected material: image, name, article, color, category, availability and choose-another action.
2. Window photo: camera/file input (`accept="image/*"`, camera hint where supported), guidance, contained preview, replace and continue.
3. Consent: processor/temporary-use notice and required checkbox.
4. Generation: stable soft states «Подготавливаем фотографию», «Создаём визуализацию», «Обрабатываем результат»; one enabled request at a time.
5. Result: contained original/result touch/keyboard before-after, selected material, disclosure and actions «Добавить в корзину», «Создать ещё вариант», «Выбрать другой материал», «Рассчитать стоимость», «Удалить фотографию».

- **AIVIS-SPEC-039 — MUST:** result disclosure is exactly: «AI-визуализация носит ознакомительный характер. Оттенок, пропорции и внешний вид могут немного отличаться от реального изделия.»
- **AIVIS-SPEC-040 — MUST:** 320, 360, 375, 390 and 430 px layouts have no horizontal scroll, accidental image crop or covered CTA; touch target is at least 44 px and errors recover without reload.
- **AIVIS-SPEC-041 — MUST:** polling backs off from the provider-documented 3–5 second image interval, stops on terminal state/timeout/unmount and resumes the existing project job after reload without creating a provider job.

## 6. Jobs, idempotency and limits

- **AIVIS-SPEC-042 — MUST:** internal states are `CREATED`, `UPLOAD_PENDING`, `READY`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `REJECTED`, `EXPIRED`, `DELETED`; transitions are allowlisted and terminal states never return to processing except an explicit new attempt.
- **AIVIS-SPEC-043 — MUST:** create/start/retry mutations require correlation and idempotency keys stored only as hashes; replay returns the prior safe result.
- **AIVIS-SPEC-044 — MUST:** `combined_request_hash` covers input hash, material ID/image hash, family, prompt version, model and output profile. A successful same-session result in a 30-minute dedup window is reused without a new paid call.
- **AIVIS-SPEC-045 — MUST:** `AI_VISUALIZER_ENABLED` and an OWNER/ADMIN database kill switch must both permit generation; missing key/service role/bucket or invalid model/output configuration fails closed.
- **AIVIS-SPEC-046 — MUST:** defaults are two successful guest generations/day, one active job/guest, one globally configured concurrency slot, one 1K output, 24-hour retention and a configurable global/day limit; signed upload and start also use guest/IP-hash/database rate events.
- **AIVIS-SPEC-047 — MUST:** one automatic retry is allowed only for transient network/429/5xx/storage errors; no automatic retry for invalid/unsupported/consent/safety/rejected/balance/daily-limit cases. Each paid attempt is an immutable attempt row.

## 7. Result, cart/request and deletion

- **AIVIS-SPEC-048 — MUST:** one decoded JPEG/PNG result is hashed and stored once at `ai-results/<job-id>/result.<ext>`; browser APIs return metadata plus a short-lived owned Supabase signed URL, never Base64 or the Polza URL.
- **AIVIS-SPEC-049 — MUST:** cart item may store only optional `aiVisualizationPublicReference`; server pricing ignores it and revalidates ownership/material when creating a request.
- **AIVIS-SPEC-050 — MUST:** order item may retain an optional foreign key to the visualization job. Expired/deleted media shows «AI-визуализация больше недоступна» while material, dimensions, quantity and price remain intact.
- **AIVIS-SPEC-051 — MUST:** WhatsApp receives only the existing safe request-summary link and text; it never claims that an image is attached and never contains Supabase/Polza private URL.
- **AIVIS-SPEC-052 — MUST:** guest deletion removes input/result if present, tombstones the job, invalidates future grants/polls/retries and preserves non-media cart/request facts.

## 8. Administration

- **AIVIS-SPEC-053 — MUST:** `/admin/ai-visualizations` shows provider/model/prompt/enabled state, today/total/success/failed/rejected/rate-limited/active counts, safe provider error groups, storage estimate, duration, attempts, next cleanup and expired count with status/model/date/material/error filters.
- **AIVIS-SPEC-054 — MUST:** OWNER/ADMIN may disable/enable only within the environment gate, edit guest/global limits and retention, delete jobs, run cleanup and request an audited image grant. Model ID/key/prompt/raw response/balance are never editable or displayed.
- **AIVIS-SPEC-055 — MUST:** MANAGER has limited aggregate read-only statistics and no image grant, settings or deletion permission. The list is metadata-only and never a photo gallery.

## 9. Safe public error contract

Public codes are `AI_DISABLED`, `INVALID_IMAGE`, `IMAGE_TOO_LARGE`, `IMAGE_TOO_SMALL`, `UNSUPPORTED_IMAGE_TYPE`, `MATERIAL_NOT_FOUND`, `MATERIAL_IMAGE_UNAVAILABLE`, `CONSENT_REQUIRED`, `RATE_LIMITED`, `DAILY_LIMIT_REACHED`, `JOB_ALREADY_RUNNING`, `PROVIDER_UNAVAILABLE`, `PROVIDER_RATE_LIMITED`, `PROVIDER_REJECTED`, `OUTPUT_INVALID`, `STORAGE_UNAVAILABLE`, `JOB_EXPIRED`, `INTERNAL_ERROR`.

Provider diagnostics `POLZA_AUTH_ERROR`, `POLZA_RATE_LIMITED`, `POLZA_BALANCE_ERROR`, `POLZA_MODEL_UNAVAILABLE`, `POLZA_INVALID_REQUEST`, `POLZA_PROVIDER_ERROR`, `POLZA_TIMEOUT`, `POLZA_OUTPUT_INVALID` remain staff-safe metadata and map to the public codes. Responses never include stack/SQL/path/prompt/provider body/Bearer/service-role/key/balance/contact data.

## 10. Acceptance status

With no configured Polza key, code/migrations/mock/static/build evidence may close implementation only as `IMPLEMENTATION_COMPLETE_POLZA_LIVE_PROVIDER_PENDING`. Live status `PASSED_PHASE_2B_POLZA_GEMINI_VISUALIZATION` additionally requires bounded rights-cleared Polza job create/poll/result import/idempotency evidence. Neither status authorizes commercial production or Phase 2C.
