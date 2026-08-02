# ADR-0009: Object storage and background job foundation

## Метаданные

| Поле | Значение |
|---|---|
| Статус | **Accepted** |
| Дата | 2026-08-02 |
| Решение принято | Product Owner, 2026-08-02; local interfaces only, production providers остаются gated |
| Supersedes | — |

## Контекст и драйверы

Accepted ADR-0006 разделяет public/private/quarantine media. AMIGO sync, derivatives, deletion and AI требуют durable background work. Foundation должен проверить adapters локально, но не ingest-ить AMIGO assets или пользовательские фотографии и не выбрать provider до data residency review.

## Варианты

1. S3-compatible object adapter + Graphile Worker over PostgreSQL.
2. Provider-specific storage SDK + Redis queue.
3. Local filesystem + in-process timers.

## Решение

1. Object access MUST идти через S3-compatible application port с раздельными public, private и quarantine namespaces, immutable keys, checksum, metadata и scoped grants.
2. Local development MUST использовать synthetic objects в disposable S3-compatible emulator, запускаемом на Windows 11 без production credentials; repository files, production buckets и real customer media запрещены.
3. Production storage vendor, region, encryption/key custody, retention and restore parameters remain gated by `TBD-INFRA-004` and `TBD-PRIV-*`.
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
| Emulator differs from provider | Contract suite runs against candidate provider before selection |

## Откат / supersede

Job runner MAY be stopped and pending jobs preserved/replayed. Storage provider migration requires checksum inventory, dual-read period, access revocation and verified rollback copy. Broker extraction preserves task names, payload versions and idempotency keys.

## Связи

- [STORAGE_MEDIA](../specs/04-technical/STORAGE_MEDIA.md)
- [AMIGO_SYNC_ARCHITECTURE](../specs/04-technical/AMIGO_SYNC_ARCHITECTURE.md)
- [AI_PIPELINE](../specs/04-technical/AI_PIPELINE.md)
- `STORAGE-SPEC-001`–`STORAGE-SPEC-020`, `NFR-ARCH-005`, `ROADMAP-1A-001`

## История

| Дата | Изменение |
|---|---|
| 2026-08-02 | Proposed local/provider-neutral storage and durable job strategy. |
| 2026-08-02 | Accepted Product Owner для Phase 1A; подтверждены отдельный Graphile worker, Windows-compatible disposable emulator и provider replacement boundary. |
