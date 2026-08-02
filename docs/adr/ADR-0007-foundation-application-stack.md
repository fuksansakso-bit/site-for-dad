# ADR-0007: Foundation application stack and repository topology

## Метаданные

| Поле | Значение |
|---|---|
| Статус | **Accepted** |
| Дата | 2026-08-02 |
| Решение принято | Product Owner, 2026-08-02; только для Phase 1A |
| Supersedes | — |

## Контекст и драйверы

Accepted [ADR-0001](ADR-0001-application-architecture.md) задаёт modular application и отдельный worker boundary, но не выбирает runtime, web framework, workspace или test tooling. MVP требует SEO/public UI, admin/account surfaces, API boundary, shared domain rules и контролируемую локальную разработку без преждевременных микросервисов.

Драйверы: малый состав команды, один product boundary, strict types, repeatable CI, vendor-neutral deployment и возможность позднего extraction по измеренной нагрузке.

## Варианты

1. TypeScript/Node modular monolith, Next.js BFF и отдельный worker в pnpm workspace.
2. Раздельные frontend/API services с первого коммита.
3. Микросервисы по domain modules.

## Решение

1. Foundation MUST использовать Node.js Active LTS exact patch, TypeScript strict ESM, `pnpm` workspace и единый lockfile.
2. `apps/web` MUST использовать current stable Next.js 16 App Router для public/account/admin surfaces и same-origin Route Handler BFF.
3. Долгие, retryable и resource-heavy операции MUST исполняться в `apps/worker`, а не в HTTP lifecycle.
4. Domain/application modules MUST находиться в framework-independent packages; web и worker зависят внутрь, domain не зависит от них.
5. Внутренние packages MUST использовать `workspace:` ranges и не публиковаться без отдельного решения.
6. CI MUST выполнять clean locked install, formatting, lint, typecheck, unit/integration/contract tests, build и E2E smoke через provider-neutral commands.
7. Baseline tests MUST использовать Vitest и Playwright; runtime input contracts MUST иметь единственный schema source, конкретная совместимая library фиксируется в acceptance record/lockfile.
8. Exact dependency versions, licenses и security advisories MUST быть перепроверены непосредственно перед bootstrap.
9. Windows 11 MUST быть first-class local development environment: root commands, path handling, service bootstrap/shutdown and tests MUST работать из PowerShell без обязательного Bash/WSL. Provider-neutral команды также MUST оставаться переносимыми в Linux CI.

## Последствия

Положительные: простой deployable boundary, общие contracts, быстрый local loop, SEO и ясный путь к worker/extraction. Отрицательные: нужны автоматические dependency rules; Next BFF нельзя использовать как скрытый long-running backend; framework upgrades требуют планового контроля.

## Риски и меры

| Риск | Мера |
|---|---|
| Framework code проникает в domain | Import-boundary tests и package dependency graph |
| Web deploy runtime не подходит jobs | Отдельный worker process и durable queue |
| Monorepo tasks расходятся локально/CI | Единственные root commands и locked toolchain |
| Bash-only tooling блокирует Windows 11 | PowerShell-safe root commands, cross-platform Node tooling и Windows smoke evidence |
| Supply-chain compromise | Frozen lockfile, provenance/license/advisory review, secret scan |

## Откат / supersede

До production data решение обратимо удалением scaffold в отдельном change. После начала функций замена оформляется новым ADR, сохраняет API/domain contracts и миграционный план. Extraction module в service допускается только после measurement и отдельного ADR.

## Связи

- [Technology evaluation](../06-plans/PHASE_1A_TECHNOLOGY_EVALUATION.md)
- [Phase 1A plan](../06-plans/active/PHASE_1A_FOUNDATION_PLAN.md)
- `NFR-ARCH-001`–`NFR-ARCH-012`, `DOR-008`, `ROADMAP-1A-001`

## Phase 1A implementation evidence

Решение реализовано без изменения boundary: Node.js `24.18.1`, pnpm `11.18.0`, TypeScript `6.0.3`, Next.js `16.2.12`, один lockfile и 11 non-empty workspaces. [apps/web](../../apps/web/package.json) содержит только technical shell/BFF health routes, [apps/worker](../../apps/worker/package.json) является отдельным process, а dependency checker запрещает обратные и циклические импорты. Root Windows lifecycle и provider-neutral CI прошли в рабочей копии и отдельном чистом clone; подробности — в [Phase 1A report](../06-plans/completed/PHASE_1A_FOUNDATION_REPORT.md).

## История

| Дата | Изменение |
|---|---|
| 2026-08-02 | Proposed stack и topology подготовлены для owner acceptance; implementation не разрешена. |
| 2026-08-02 | Accepted Product Owner для Phase 1A после проверки с `GLOBAL_SPEC` и Foundation plan; Windows 11 закреплена явно. |
| 2026-08-02 | Phase 1A conformance verified: pinned workspace, separate worker, boundary tests, Windows lifecycle and clean-clone CI passed. |
