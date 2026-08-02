# ADR-0008: PostgreSQL persistence and migration safety

## Метаданные

| Поле | Значение |
|---|---|
| Статус | **Accepted** |
| Дата | 2026-08-02 |
| Решение принято | Product Owner, 2026-08-02; только для Phase 1A foundation schema |
| Supersedes | — |

## Контекст и драйверы

PROJECT_NAME хранит связанные catalog entities, immutable source/price versions, exact money, configurations, permissions, audit and jobs. Нужны транзакции, constraints, reproducible history и безопасный deploy/rollback. `DATA_MODEL` остаётся логическим источником и не разрешает автоматически генерировать production schema.

## Варианты

1. PostgreSQL + Prisma ORM/Migrate с review generated SQL.
2. PostgreSQL + hand-written migrations/query builder.
3. Document database и application-only integrity.

## Решение

1. Primary relational datastore MUST быть PostgreSQL supported release; provider/region остаются `TBD-INFRA-004`.
2. Prisma ORM/Migrate current stable major MUST стать typed data/migration tool после Phase 1A compatibility verification. Если verification не проходит, schema work останавливается; замена toolkit требует superseding ADR и отдельного решения владельца, а не самостоятельного fallback.
3. Money MUST храниться целым количеством копеек, dimensions — целым количеством миллиметров; floating-point persistence для них запрещён.
4. Migration SQL and history MUST храниться в Git, проходить review и никогда не редактироваться после shared application.
5. `db push`/schema auto-sync MUST NOT применяться к shared, staging или production databases.
6. Изменения MUST следовать expand/contract и совместимости N/N-1 application; destructive contract — отдельным release после backfill/verification.
7. До deploy MUST быть preflight lock/size analysis, backup/PITR evidence, restore rehearsal according to environment и named recovery owner.
8. Failed migration MAY быть marked/recovered штатным tool flow. Успешно применённая migration обычно откатывается forward compensation; down SQL не считается data rollback без test evidence.
9. Migration acceptance MUST включать clean apply, replay from empty database, upgrade from previous snapshot, rollback/compensation rehearsal и schema drift check.

## Последствия

Relational invariants и reproducible schema получают единый control plane. Цена — review generated SQL, PostgreSQL operations и необходимость двухшаговых breaking changes.

## Риски и меры

| Риск | Мера |
|---|---|
| Generated migration блокирует таблицу | Create-only/review, staged backfill, concurrent-compatible operation где возможно |
| Application rollback несовместим со схемой | Expand-first, N/N-1 contract tests |
| Потеря данных при down migration | Backup/restore + forward compensation; destructive down запрещён без доказательства |
| ORM не выражает нужный Postgres feature | Reviewed custom SQL или fallback toolkit через superseding ADR |

## Откат / supersede

До schema creation решение обратимо. После данных замена ORM сохраняет PostgreSQL schema/history и проходит dual-read/write or adapter migration. Замена database engine требует отдельного ADR, export/import reconciliation, downtime/rollback plan.

## Связи

- [DATA_MODEL](../specs/04-technical/DATA_MODEL.md)
- [DEPLOYMENT](../specs/04-technical/DEPLOYMENT.md)
- [Technology evaluation](../06-plans/PHASE_1A_TECHNOLOGY_EVALUATION.md)
- `DATA-SPEC-001`–`DATA-SPEC-012`, `DEPLOY-SPEC-001`–`DEPLOY-SPEC-020`, `ROADMAP-1A-001`

## Phase 1A implementation evidence

[packages/db](../../packages/db/package.json) использует PostgreSQL `18.4`, Prisma `7.9.1` и три reviewed, immutable infrastructure-only migrations. Disposable SCRAM database evidence подтверждает apply с пустой базы, безопасный повтор, upgrade с первого snapshot, clean drift, запрет runtime DDL, append-only audit и штатный failed-migration resolve + forward compensation. Production auto-migrate и business tables отсутствуют; полный протокол — в [Phase 1A report](../06-plans/completed/PHASE_1A_FOUNDATION_REPORT.md).

## История

| Дата | Изменение |
|---|---|
| 2026-08-02 | Proposed persistence, migration и rollback boundary создан; SQL не создавался. |
| 2026-08-02 | Accepted Product Owner для Phase 1A; Prisma/Migrate сделаны обязательным выбранным toolkit, а смена требует superseding ADR. |
| 2026-08-02 | Phase 1A conformance verified on three migrations and clean/repeat/upgrade/drift/failure-recovery paths. |
