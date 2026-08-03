# ADR-0009: Object storage and background job foundation

## Метаданные

| Поле | Значение |
|---|---|
| Статус | **Accepted** |
| Дата | 2026-08-02 |
| Решение принято | Product Owner, 2026-08-02; local adapter уточнён `OWNER-DECISION-011`, 2026-08-03; production providers остаются gated |
| Supersedes | — |

## Контекст и драйверы

Accepted ADR-0006 разделяет public/private/quarantine media. AMIGO sync, derivatives, deletion and AI требуют durable background work. Foundation должен проверить adapters локально, но не ingest-ить AMIGO assets или пользовательские фотографии и не выбрать provider до data residency review.

## Варианты

1. S3-compatible object adapter + Graphile Worker over PostgreSQL.
2. Provider-specific storage SDK + Redis queue.
3. Local filesystem + in-process timers.

## Решение

1. Object access MUST идти через S3-compatible application port с раздельными public, private и quarantine namespaces, immutable keys, checksum, metadata и scoped grants.
2. Local development и CI MUST использовать VersityGW `v1.4.1` (`sha256:0400cb59f59da0f1cf9f7fd49505191abc348dfadf54509bf1988caaff4eb96f`) как disposable S3-compatible adapter в Linux-контейнере Docker Compose: POSIX backend, отдельные Docker named volumes для data/versioning/IAM, loopback-only S3/Admin endpoints, private-by-default buckets, `restart: always` и credentials только из environment. Object-data bind mount в Windows filesystem запрещён. RustFS остаётся историческим Phase 1A evidence и не является активной local/CI конфигурацией.
3. Production storage vendor, region, encryption/key custody, retention and restore parameters remain gated by `TBD-INFRA-004`, `TBD-INFRA-010` and `TBD-PRIV-*`.
4. Durable background work MUST использовать Graphile Worker в отдельном process и том же PostgreSQL control plane в MVP.
5. Job handlers MUST быть idempotent, versioned, retry-safe, observable and at-least-once aware; payload MUST contain references/minimal metadata, not image bytes, secrets or raw PII.
6. Queue schema lifecycle MUST follow ADR-0008 migration/recovery controls.
7. Measured saturation, isolation or compliance need MAY trigger a separate broker/provider through superseding ADR.

## Последствия

Foundation получает один durable datastore и сменяемый object API. Цена — Postgres queue load must be observed, S3 semantics need contract tests, provider-specific features remain unavailable until ADR update.

## Риски и меры

| Риск | Мера |
|---|---|
| Duplicate job effects | Idempotency key, state transition guard, replay tests |
| DB overload | Queue metrics, concurrency caps, backpressure, extraction threshold |
| Public/private mixing | Separate namespaces/credentials/policies and negative access tests |
| Local adapter differs from production provider | Provider-neutral contract suite runs against VersityGW и MUST повторяться против candidate production provider before selection |
| Windows bind-mount locking/atomic-write mismatch | POSIX backend хранится только в Docker named volumes; обязательны 515 180-byte round trip, multipart и restart-persistence gates |

## Откат / supersede

Job runner MAY be stopped and pending jobs preserved/replayed. Storage provider migration requires checksum inventory, dual-read period, access revocation and verified rollback copy. Broker extraction preserves task names, payload versions and idempotency keys.

## Связи

- [STORAGE_MEDIA](../specs/04-technical/STORAGE_MEDIA.md)
- [AMIGO_SYNC_ARCHITECTURE](../specs/04-technical/AMIGO_SYNC_ARCHITECTURE.md)
- [AI_PIPELINE](../specs/04-technical/AI_PIPELINE.md)
- `STORAGE-SPEC-001`–`STORAGE-SPEC-020`, `NFR-ARCH-005`, `ROADMAP-1A-001`

## Phase 1A historical implementation evidence

[packages/storage](../../packages/storage/package.json) реализует provider-neutral S3 port и отдельные private/quarantine/public-delivery trust zones. Phase 1A synthetic contract исторически прошёл на loopback-only RustFS `1.0.0-beta.11`, но Phase 1B.1 real-media preflight воспроизвёл Windows write failure на 159 099/262 144/515 180-byte objects, поэтому это evidence не разрешает дальнейшее использование RustFS. [packages/jobs](../../packages/jobs/package.json) и [apps/worker](../../apps/worker/package.json) продолжают использовать Graphile Worker `0.17.3` вне HTTP lifecycle; PostgreSQL/queue решение не менялось.

## Phase 1B.1 local adapter update

`OWNER-DECISION-011` сохранил внешний `StoragePort` и заменил только local/CI adapter runtime. Gate прошёл 2026-08-03: 15/15 automated cases, exact nine-size byte/SHA matrix, real 515,180-byte AMIGO JPEG SHA-256 `ac86fc976afc2063cc97e1528611c978a348f357d26c8fe3c59b7c23f113d0cd`, signed read/write, path-style SigV4, multipart completion/abort, immutable/idempotent same-key behavior, all-private negative access, graceful container restart, full Docker Desktop auto-recovery и named-volume persistence. Последующий pilot импортировал и повторно проверил 59/59 allowlisted objects (8,340,101 bytes), сохранил их после полного restart и выдал 32/32 primary images через controlled version-pinned route. Production provider остаётся `TBD-INFRA-010`.

## История

| Дата | Изменение |
|---|---|
| 2026-08-02 | Proposed local/provider-neutral storage and durable job strategy. |
| 2026-08-02 | Accepted Product Owner для Phase 1A; подтверждены отдельный Graphile worker, Windows-compatible disposable emulator и provider replacement boundary. |
| 2026-08-02 | Phase 1A conformance verified against disposable RustFS/PostgreSQL with no real media, business jobs or provider commitment. |
| 2026-08-03 | `OWNER-DECISION-011` вывел RustFS из активной local/CI конфигурации после воспроизводимого Windows real-image failure и выбрал local-only VersityGW Docker/POSIX named-volume adapter без production commitment. |
| 2026-08-03 | Phase 1B.1 conformance подтвердил provider-neutral adapter на 59 real assets, signed/multipart/restart/full CI и immutable same-key race regression; выбор production provider не сделан. |
