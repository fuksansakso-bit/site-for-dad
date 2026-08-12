# AI VISUALIZATION LIVE QA

## Execution evidence

- Live Polza Media calls executed: **1** (`LIVE-QA-20260812-01`, 2026-08-12 22:16 MSK).
- The configured server-only Polza key and model were present; the browser never received either secret or a provider response.
- Supabase cloud preflight passed before the call: migrations are applied, `ai-inputs` and `ai-results` are private, and the effective limit remains two attempts per guest/day, 20 globally, one concurrent job and 24-hour retention.
- A registered partner-licensed, non-personal kitchen scene and the exact published catalog material were used. Client preprocessing removed metadata, normalized the source to JPEG and uploaded 122,550 bytes at 1500×937 directly to the private input bucket.
- The job reached the server-side Polza adapter but failed before a provider job ID/status was returned: client code `PROVIDER_UNAVAILABLE`, normalized provider code `POLZA_PROVIDER_ERROR`. The public UI exposed only «AI-визуализация временно недоступна. Попробуйте позже» and retained calculate/delete recovery actions.
- The user-visible deletion path then passed: the job became `DELETED`, and both private AI buckets returned zero remaining root objects. No result, quality score or successful provider import is claimed.
- Mock/browser evidence: one deterministic full-flow Playwright scenario passed across 320/360/375/390/430 px; it is not reported as provider quality evidence.
- Provider contract evidence: create/status mapping, 429 bounded retry, 5xx/error normalization and result-import security are covered locally.
- Required next run: retry from the target-account Vercel Preview or after Polza connectivity is available, without exceeding the remaining `AI_LIVE_TEST_LIMIT`; record provider job creation, polling, private result import, idempotency and visual review.

**Статус:** `Live visual QA pending`  
**Фаза:** Phase 2B  
**Дата проверки доступности:** 2026-08-12  
**Провайдер:** Polza AI Media API  
**Модель:** `google/gemini-3.1-flash-image`

## Текущий результат

Ключ, cloud schema, приватные buckets, upload/ownership/delete и безопасная деградация подтверждены, но первый реальный запрос не вернул provider job ID и завершился как `POLZA_PROVIDER_ERROR`. Поэтому результат Gemini и копирование в `ai-results` ещё не подтверждены, mock-результаты не считаются live evidence, а допустимый статус остаётся `IMPLEMENTATION_COMPLETE_POLZA_LIVE_PROVIDER_PENDING`.

## Ограниченный сценарий после выдачи ключа

Владелец выполняет не более `AI_LIVE_TEST_LIMIT` и не более трёх генераций: рулонные жалюзи, «Зебра» / «День-Ночь» и горизонтальные либо вертикальные жалюзи. Используются только разрешённые неперсональные фотографии окон и одобренные изображения материалов из сохранённого каталога.

Для каждого вызова фиксируются без секретов и фотографий: время, семейство, ориентация, internal job reference, наличие provider job ID, конечный статус, импорт результата в private Supabase Storage, результат повторного idempotency-запроса и визуальная оценка по `AI_EVALUATION_SPEC.md`.

## Критерии live-прохода

- Polza job создаётся и опрашивается через официальный Media API;
- используется настроенная модель, а клиент не получает provider response или key;
- результат является декодируемым изображением и копируется в `ai-results`;
- браузер использует только краткоживущий Supabase signed URL;
- комната и окно остаются узнаваемыми, а семейство и материал визуально соответствуют референсу без обещания абсолютной точности;
- повтор с тем же idempotency key не создаёт второй платный provider job;
- после импорта временный Polza URL не нужен.

Live-проход не разрешает production launch: он остаётся зависимым от `TBD-AI-002`, `TBD-PRIV-003`, `TBD-PRIV-005` и `TBD-INFRA-004`.
