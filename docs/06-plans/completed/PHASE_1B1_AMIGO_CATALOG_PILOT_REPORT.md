# PHASE 1B.1 — AMIGO CATALOG PILOT completion report PROJECT_NAME

## 0. Control block

| Поле | Значение |
|---|---|
| Phase | `1B.1 — AMIGO CATALOG PILOT AND LOCAL PUBLICATION LAYER` |
| Result | **PASSED_PHASE_1B1_AMIGO_CATALOG_PILOT** |
| Date | 2026-08-03, Europe/Moscow |
| Recovery-task baseline | `d851647ab243e432641d650cb29e3d8132a92af1` |
| Phase branch | `phase/1b-amigo-catalog-pilot` |
| Owner authorization | `OWNER-DECISION-010`; local storage correction `OWNER-DECISION-011` |
| Acceptance | `QG-169`–`194`, `PLAN-1B1-001` |
| Later phases | **NOT AUTHORIZED / NOT STARTED** |

Результат завершает только frozen 32-ID pilot. Он не разрешает Phase 1B.2, Phase 1C, полный AMIGO import, configurator/calculation/minimum-price/preview/cart/WhatsApp/AI или production infrastructure selection.

## 1. Исходный commit hash

Текущая storage-recovery работа начата от `d851647ab243e432641d650cb29e3d8132a92af1` (`feat: add catalog synchronization pipeline`). Более ранний Phase 1B.1 branch baseline — `943d4a2efa5e05f0d05493633cf5eb549e072a22`; он не переписывался.

## 2. Сохранённые существующие commits

| Commit | Message | Состояние |
|---|---|---|
| `85a1182` | `docs: authorize Phase 1B.1` | Сохранён |
| `16eaae3` | `feat: add catalog source data model` | Сохранён |
| `93563c8` | `feat: add catalog source adapters` | Сохранён |
| `d851647` | `feat: add catalog synchronization pipeline` | Сохранён |

Ни один commit не откатывался. Historical run `798d5513-27b1-48e3-ab8e-389eeb672db4` не переписан и остаётся `FAILED / CATALOG_PIPELINE_STORAGE_UNAVAILABLE`.

## 3. Перенесённый media WIP

Полный исходный diff был изучен до изменения storage. WIP сохранён и перенесён на provider-neutral VersityGW-backed adapter в следующих файлах:

- `apps/worker/package.json`, `apps/worker/src/index.ts`, `apps/worker/src/runtime.ts`;
- `packages/catalog/src/adapters/amigo/adapter.ts`, `media-transport.ts`, `packages/catalog/src/adapters/fixture.ts`, `packages/catalog/src/index.ts`, `packages/catalog/src/types.ts`;
- `packages/catalog/test/amigo-media-transport.test.ts`, `fixture-adapter.test.ts`, `support/fixture-dataset.ts`;
- `packages/jobs/src/catalog/contracts.ts`, `errors.ts`, `media.ts`, `services.ts`, `packages/jobs/src/index.ts`;
- `packages/jobs/test/integration/catalog-sync.integration.test.ts`, `support/catalog-fixture.ts`, `unit/catalog-jobs.test.ts`, `unit/catalog-media.test.ts`;
- `tooling/scripts/database-integration.ps1`, `pnpm-lock.yaml`, active plan and changelog.

WIP media importer не был закоммичен до прохождения storage gate; после gate он получил отдельный commit.

## 4. VersityGW version and digest

Active local/CI image:

`versity/versitygw:v1.4.1@sha256:0400cb59f59da0f1cf9f7fd49505191abc348dfadf54509bf1988caaff4eb96f`

RustFS `1.0.0-beta.11` сохранён только как historical Phase 1A evidence и полностью удалён из active local/CI configuration. Поскольку `OWNER-DECISION-010` уже был занят разрешением Phase 1B.1, уникальное storage decision зарегистрировано как `OWNER-DECISION-011`; существующий ID не переиспользовался.

## 5. Docker Compose configuration

VersityGW работает в Linux-контейнере Docker Compose с POSIX backend. S3 и Admin API публикуются только на `127.0.0.1`; production-код не привязан к портам. Image tag и digest фиксированы, healthcheck обязателен, `restart: always` обеспечивает восстановление после Docker Desktop restart, а graceful SIGTERM/shutdown проверен. Root credentials поступают только из локального environment; `.env.example` содержит placeholders, secrets/logs/evidence не содержат значений credentials. Три buckets `PRIVATE`, `QUARANTINE`, `PUBLIC_DELIVERY` создаются идемпотентной provisioning-командой и остаются private; anonymous list/read/write запрещены.

## 6. Named volumes

- `project_name_catalog_s3_data`;
- `project_name_catalog_s3_versioning`;
- `project_name_catalog_s3_iam`.

Windows/NTFS bind mount object directory не используется. Обычные `dev:stop`/`dev`, container restart и Docker Desktop restart сохраняют данные; удаление volumes возможно только явным destructive `dev:reset`.

## 7. Storage size matrix

Каждый размер прошёл put, head, get, byte-for-byte equality, SHA-256 equality, content length/type/metadata, signed read/write, delete и missing head after delete.

| Размер | Режим | Результат |
|---:|---|---|
| 1 byte | single PUT | PASS |
| 65,536 bytes | single PUT | PASS |
| 131,072 bytes | single PUT | PASS |
| 159,099 bytes | single PUT | PASS; RustFS regression size |
| 262,144 bytes | single PUT | PASS; RustFS regression size |
| 515,180 bytes | real AMIGO JPEG | PASS |
| 1,048,576 bytes | single PUT | PASS |
| 5,242,880 bytes | threshold boundary | PASS |
| 6,291,456 bytes | above 5 MiB multipart threshold | PASS |

Full contract result: **15/15 PASS**. Дополнительно прошли invalid MIME, oversize, wrong checksum, timeout, retries, unavailable dependency, concurrent different files, immutable same-key race, same-content idempotence, deduplication, multipart abort and anonymous-access negative cases.

## 8. AMIGO image 515,180 bytes

Контрольный разрешённый JPEG имеет `515,180` bytes и SHA-256 `ac86fc976afc2063cc97e1528611c978a348f357d26c8fe3c59b7c23f113d0cd`. Hash совпал после direct StoragePort round trip, signed read, media import, controlled public delivery и restart. HTTP success без equality не использовался как критерий.

## 9. Signed URLs

Scoped SigV4 path-style signed read и signed write прошли: read вернул HTTP `200` и точные bytes; write принял только требуемые length/type/checksum/metadata headers, а последующий get/head подтвердил содержимое. TTL bounded, object scope exact, permanent URL и client credential disclosure отсутствуют.

## 10. Multipart upload

Payload `6,291,456` bytes выше configured `5,242,880`-byte threshold прошёл create/upload parts/complete/get/SHA verification/delete. Explicit abort удалил незавершённый upload и не оставил доступного объекта. Wrong checksum and conflicting immutable completion fail closed.

## 11. Restart persistence

Проверены два уровня:

1. disposable storage container graceful restart сохранил object checksum в named volume;
2. полный `dev:stop` → `dev` restart сохранил PostgreSQL history, active CatalogVersion/PriceVersion, 59 object hashes, web/worker health и historical failed run.

Повторный запуск после полного Docker Desktop restart также восстановил VersityGW автоматически с теми же volumes; `File access denied` и ручное изменение NTFS permissions не потребовались.

## 12. Новый sync run

Финальный реальный manual run: `9bd1a4f8-e456-4617-9e16-7f5604c1c65c`.

- correlation ID: `catalog-admin-manual-sync-ff262613-867b-4406-b53e-9575d6a69a55`;
- status: `COMPLETED`;
- processed/discovered/errors: `275 / 275 / 0`;
- active CatalogVersion: `41b039a5-951d-4de3-873e-7565e2c7e9b0`, v1, checksum `57c83711748eabd125ac64e495736dd27ebb9c238dbebd26a07f57c9f7d7112b`;
- active PriceVersion: `ec19a7d7-c19a-45e1-86f9-269f01007fd0`, v1, checksum `4f42db1620e766a454cd5a48b91c8fcc4dd1d73a03ae22f386cc16f239247a54`.

Recovery lineage run `f9407db3-9e82-4174-9e21-87528bdd7092` refers to the historical failure. Initial idempotency repeat `642f2bc2-387b-44fe-9d52-e05cd78e374c` and post-publication no-op repeat `aee135bd-855a-4fb6-a8e1-2fe60e61728a` are retained.

## 13. Импортированные изображения

Imported: **59/59** allowlisted `MediaAsset` objects, total `8,340,101` bytes, mapped to **32/32** pilot `MaterialVariant`; every variant has at least one usable local image. Active public composition exposes **32** primary images through the controlled same-origin route. Six raw snapshots, 32 source entities/variants, 59 source media links and 32 source price records remain present.

## 14. Неудачные media items

Final media runs: **0 item-level failures**. No hotlink fallback was used. The separate automatically recorded failed attempt `fd476c5b-015d-4643-b4ab-da5f82e53f98` and required historical failed run remain as audit history rather than being rewritten to success.

## 15. Deduplication and idempotency

The pilot contains 59 distinct media hashes; repeating the import created zero duplicate `SourceEntity`, `MaterialVariant`, `SourcePriceRecord`, `MediaAsset` or media link. Post-publication no-op run `aee135bd-855a-4fb6-a8e1-2fe60e61728a` completed 275/275 with no errors, created no CatalogVersion/PriceVersion and changed no active pointer/count. Same-content immutable storage put returns the existing metadata; different content at the same key returns `STORAGE_CONFLICT`, including the concurrent race regression.

## 16. Новые commits

| Commit | Message |
|---|---|
| `0bb9ba0` | `fix: replace local RustFS emulator with VersityGW` |
| `3e3064a` | `feat: add catalog media import` |
| `f4ff3b0` | `feat: add catalog versioning and diff` |
| `2d937b5` | `feat: add catalog business overlays` |
| `38735b0` | `feat: add admin catalog pilot` |
| `ff98766` | `feat: add public catalog pilot` |
| `d956ea0` | `fix: serialize immutable object writes` |
| `39caf09` | `test: verify catalog synchronization and publication` |

Final `docs: complete Phase 1B.1 pilot` contains this report; its hash is read from Git history after commit rather than embedded self-referentially.

## 17. Pilot Acceptance Gate

Result: **PASSED_PHASE_1B1_AMIGO_CATALOG_PILOT**.

- `pnpm.cmd test:catalog-pilot`: PASS;
- real source/media/catalog/public acceptance: PASS;
- VersityGW contract: 15/15 PASS;
- Playwright: 25/25 PASS across Chromium, Firefox, WebKit, narrow and reduced-motion profiles;
- exact-toolchain `pnpm.cmd ci:verify`: 9/9 stages PASS with Node 24.18.1, pnpm 11.18.0, PostgreSQL 18.4, Docker Engine 29.6.2, Playwright 1.62.1 and digest-pinned VersityGW v1.4.1;
- formatting, documentation IDs/links/tables, phase scope, package boundaries, lint, strict typecheck, coverage, migrations/recovery, production build, artifact/repository secret scans and critical advisory scan: PASS.

The initial full CI run exposed the same-key concurrency defect; it was fixed and both the focused storage gate and complete CI were rerun successfully. No failed test was waived or replaced by a fake adapter.

## 18. Git status

Final handoff target: branch `phase/1b-amigo-catalog-pilot`, clean tracked and untracked worktree after the documentation commit. Runtime/build/test evidence under ignored `.local` and user cache directories is not committed and contains no credentials in reports. The authoritative final commit/status is Git history at handoff.

## 19. Remaining TBD

No open TBD blocks the completed frozen pilot. Material future gates remain visible:

- `TBD-INFRA-010`: production object-storage provider/region/encryption/migration/exit path;
- `TBD-SOURCE-AMIGO-002`: official/full AMIGO export/transport/schema/update process;
- `TBD-ASSORT-002`: full catalog inventory beyond the 32-ID allowlist;
- `TBD-ASSORT-003`: compatibility matrix required for configurator/pricing;
- `TBD-PRICE-001`: full verified price/formula/rule/parity data for numeric pricing;
- applicable `TBD-PRIV-*`, production hosting/RPO/RTO/legal/identity gates for later phases.

VersityGW remains local/CI-only; Supabase Storage, Cloudflare R2, AWS S3 or another production provider was not selected.

## 20. Phase boundary confirmation

**Phase 1C was not started.** No width/height calculation, minimum-price application, configurator, standard preview, cart, WhatsApp, AI, customer-photo pipeline or production deployment/provider selection was added. Work stops at the completed Phase 1B.1 boundary and requires a new written Product Owner decision to continue.
