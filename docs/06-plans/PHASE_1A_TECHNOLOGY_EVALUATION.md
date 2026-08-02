# Phase 1A technology evaluation PROJECT_NAME

## 0. Назначение и статус

| Поле | Значение |
|---|---|
| Дата проверки | 2026-08-02 |
| Статус | **RECOMMENDED / ADR ACCEPTANCE REQUIRED** |
| Область | Только Foundation; hosting, production data residency, e-mail/SMS и AI provider не выбираются |
| Решения | [ADR-0007](../adr/ADR-0007-foundation-application-stack.md), [ADR-0008](../adr/ADR-0008-postgresql-and-migration-safety.md), [ADR-0009](../adr/ADR-0009-object-storage-and-background-jobs.md), [ADR-0010](../adr/ADR-0010-identity-secrets-and-observability-boundary.md) |

Документ сравнивает минимальный стек, достаточный для последовательного MVP. Версии библиотек MUST быть повторно проверены и точно закреплены lockfile в первом разрешённом implementation commit; floating `latest` в CI и production запрещён.

## 1. Драйверы

- один небольшой продукт и команда без доказанной потребности в микросервисах;
- общие типы и инварианты каталога, цены, preview, заявок и прав;
- локальная автономность от AMIGO и сменяемые внешние adapters;
- приватные uploads, durable jobs и строгий audit trail;
- воспроизводимые миграции, price snapshots и сохранённые расчёты;
- возможность развернуть стек у разных провайдеров после решения data residency/network TBD;
- минимальное количество operational dependencies в Foundation.

## 2. Рекомендованный baseline

| Область | Рекомендация | Почему | ADR / gate |
|---|---|---|---|
| Runtime | Node.js 24 Active LTS, exact patch pin; TypeScript strict ESM | Поддерживаемая production-линия и единый язык приложений/worker/contracts | ADR-0007; повторная проверка перед bootstrap |
| Workspace | `pnpm` workspace с одним lockfile; Turborepo только как task graph/cache | Строгие workspace dependencies и единые проверки без публикации внутренних packages | ADR-0007 |
| Web/BFF | Next.js 16 App Router; public, account и admin route groups; Route Handlers только как BFF/API boundary | SSR/SEO, responsive UI и same-origin server boundary; долгие задачи вынесены в worker | ADR-0007 |
| Domain shape | Модульный монолит с dependency rules; отдельный `apps/worker` | Дешёвые локальные транзакции сейчас, ясный extraction seam позже | Accepted ADR-0001 + ADR-0007 |
| Contracts | Runtime schemas и generated API documentation from one contract source | Входы не доверяются, client/server drift ловится тестами | ADR-0007; конкретная schema library фиксируется при acceptance |
| Database | PostgreSQL; Prisma ORM/Migrate current stable major, generated SQL reviewable | Relational integrity, transactions, versioned migration history и typed access | ADR-0008 |
| Jobs | Graphile Worker over PostgreSQL, separate worker process, at-least-once/idempotent handlers | Durable retries без второго broker в MVP | ADR-0009 |
| Objects | S3-compatible adapter; private/public/quarantine namespaces; local emulator in dev | Vendor-neutral API и явные trust zones | Accepted ADR-0006 + ADR-0009 |
| Auth | Better Auth shortlisted for self-hosted database sessions; public activation disabled until identity/legal review | Не писать собственную session/password cryptography; сохранить данные в выбранном production perimeter | ADR-0010 |
| Observability | Structured JSON logs + OpenTelemetry traces/metrics behind OTLP; PII denylist | Correlation без привязки к monitoring vendor | ADR-0010 |
| Tests | Vitest for unit/integration, contract tests against real PostgreSQL/storage, Playwright for E2E/browser/a11y | Быстрый domain loop и реальная cross-browser проверка | ADR-0007; TEST_STRATEGY |
| CI | Provider-neutral commands; clean install, formatting, lint, typecheck, unit, contract/integration, build, migration check, secret scan | Remote provider пока неизвестен; одинаковые локальные и CI gates | ADR-0007/0008/0010 |

## 3. Рассмотренные варианты

### 3.1. Application topology

| Вариант | Плюсы | Минусы | Итог |
|---|---|---|---|
| Next.js BFF + modular monolith + worker | Один deployable web boundary, SEO, общие contracts, отдельные долгие jobs | Нужны dependency rules; BFF не должен стать бесструктурным backend | Рекомендован |
| Отдельные frontend и API с первого дня | Жёсткая network boundary | Дублирование auth/contracts/deploy, больше latency/operations без доказанной нагрузки | Не выбран для Foundation |
| Микросервисы | Независимое масштабирование | Distributed transactions, queues, tracing и release complexity преждевременны | Отклонён |

### 3.2. Persistence

| Вариант | Плюсы | Минусы | Итог |
|---|---|---|---|
| PostgreSQL + Prisma Migrate | Typed client, explicit customizable SQL history, drift/deploy workflow | Generated SQL требует review; rollback данных не автоматический | Рекомендован с expand/contract policy |
| PostgreSQL + hand-written SQL/Kysely | Максимальный SQL control | Больше ручной schema/type synchronization | Fallback, если spike выявит несовместимость Prisma |
| Document database | Гибкая запись snapshots | Слабее естественная защита связей, price/version/audit invariants | Отклонён |

### 3.3. Background jobs

| Вариант | Плюсы | Минусы | Итог |
|---|---|---|---|
| Graphile Worker | PostgreSQL durability, retries/backoff, deduplication, один основной datastore | At-least-once требует idempotency; DB load нужно наблюдать | Рекомендован для MVP |
| Redis-backed queue | Высокий throughput, зрелая ecosystem | Дополнительный stateful service, backup/security/monitoring | Deferred until measured need |
| In-process timers | Просто | Потеря jobs при restart, нет корректного ownership/rollback | Запрещён для durable work |

### 3.4. Identity

| Вариант | Плюсы | Минусы | Итог |
|---|---|---|---|
| Better Auth, self-hosted DB sessions | Sessions/revocation/rate limiting/rotation; provider-neutral | Нужны upgrade/security review и выбранный production credential flow | Shortlist для ADR acceptance |
| Managed identity provider | Меньше auth operations | Vendor/data residency/cost/provider TBD | Допустимая замена после сравнения |
| Собственная auth cryptography | Полный контроль | Непропорциональный security risk | Запрещена |

## 4. Migration и rollback baseline

1. Migration history хранится в Git и применяется только forward-командой CI/release pipeline.
2. `db push`, auto-sync схемы и изменение уже применённой migration запрещены вне одноразовой локальной prototype-базы.
3. Каждая migration классифицируется как additive, backfill, constraint/index или destructive.
4. Shared/production rollout использует expand → dual-compatible deploy/backfill → contract; destructive contract выполняется отдельным релизом после доказательства отсутствия старых readers/writers.
5. До применения фиксируются backup/PITR readiness, preflight, lock/size impact и проверенный recovery path.
6. Неуспешная migration откатывается инструментальным failed-migration flow; успешно применённая migration обычно компенсируется новой forward migration. Down script не считается откатом данных без отдельного доказательства.
7. Application rollback допускается только к версии, совместимой с уже расширенной схемой.

Это отвечает stop condition о способе отката миграций, но production backup/PITR provider остаётся gate Phase 1H.

## 5. Secrets baseline

- `.env.example` содержит только имена и описания, без значений.
- Локальные значения находятся в ignored `.env.local` или OS secret store; test secrets synthetic.
- CI и production получают versioned secrets из управляемого secret store через runtime injection; секреты не bake-ятся в image, bundle, logs или artifacts.
- Public environment имеет explicit allowlist; прочие значения server-only и проверяются runtime schema при старте.
- Secret scanning выполняется до merge; rotation/revocation owner, procedure и audit evidence обязательны до shared credentials.
- Production credentials, AMIGO exports и user media не используются в local/CI fixtures.

## 6. Evidence, проверенное 2026-08-02

| Источник | Наблюдение, использованное в оценке |
|---|---|
| [Node.js releases](https://nodejs.org/en/about/previous-releases) | Production должен использовать Active/Maintenance LTS; Node 24 имеет LTS status на дату проверки. |
| [Next.js 16](https://nextjs.org/blog/next-16) и [BFF guide](https://nextjs.org/docs/app/guides/backend-for-frontend) | App Router/Route Handlers поддерживают BFF, но long-running/shared-state work нельзя предполагать внутри handler runtime. |
| [pnpm workspaces](https://pnpm.io/workspaces) | Workspace и `workspace:` protocol дают строгую локальную связь packages и общий lockfile. |
| [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate) и [down migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/generating-down-migrations) | SQL history versioned/customizable; schema rollback не возвращает автоматически изменённые данные. |
| [Graphile Worker](https://worker.graphile.org/docs) | Jobs хранятся в PostgreSQL, исполняются at least once и повторяются с backoff. |
| [Better Auth security](https://better-auth.com/docs/reference/security) | DB sessions, revocation, CSRF controls, rate limits и secret rotation доступны как library boundary. |
| [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/) | OTLP-compatible instrumentation сохраняет export vendor-neutral. |
| [Playwright](https://playwright.dev/docs/intro) | Один E2E runner покрывает Chromium, Firefox, WebKit и mobile emulation. |

External documentation changes over time. Exact versions, licenses, advisories and compatibility MUST be reverified in Phase 1A before dependency installation.

## 7. Решение readiness

Рекомендация достаточна для детального Phase 1A plan, но не считается принятой архитектурой до перевода `ADR-0007`–`0010` из `Proposed` в `Accepted` письменным решением владельца. Ни hosting, ни production storage region, ни AI provider этим документом не выбираются.

## 8. История

| Версия | Дата | Изменение |
|---|---|---|
| 1.0.0 | 2026-08-02 | Сравнён и рекомендован минимальный Foundation stack, определены migration/secrets baselines и gates. |
