# Phase 1A dependency baseline

Verification date: **2026-08-02**. This file records exact implementation inputs for
`PLAN-1A-001`; the lockfile remains the authoritative resolved dependency graph.

## Runtime and services

| Component  | Exact version | License/source                                                           | Verification                                                                                                                        |
| ---------- | ------------: | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Node.js    |       24.18.1 | MIT, official Node.js distribution                                       | Windows x64 archive SHA-256 `ec56b84a7551893ab2324ebdfdc4ab974a63b4781162600b68a1293cc3e53765`                                      |
| pnpm       |       11.18.0 | MIT, npm registry                                                        | Requires Node.js `>=22.13`; pinned in `packageManager` and the lockfile                                                             |
| PostgreSQL |          18.4 | PostgreSQL License, official EDB Windows binary linked by postgresql.org | Windows x64 archive SHA-256 `02e239529ed7833d169f98d915d3feffe0813264b08b3ae353e78e8b9c97e1a6`; password-authenticated smoke passed |

## Application and quality toolchain

| Responsibility       | Exact selection                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------- |
| Workspace/task graph | Turborepo 2.10.8                                                                             |
| Language             | TypeScript 6.0.3, `@types/node` 24.13.3                                                      |
| Web/BFF              | Next.js 16.2.12, React/React DOM 19.2.8                                                      |
| Runtime validation   | Zod 4.4.3                                                                                    |
| PostgreSQL           | Prisma/Prisma Client/adapter-pg 7.9.1, pg 8.22.0                                             |
| Durable jobs         | Graphile Worker 0.17.3                                                                       |
| Object storage       | AWS SDK S3 client/presigner 3.1101.0; emulator selection is recorded with the storage commit |
| Telemetry            | OpenTelemetry API 1.9.1, SDK/exporter 0.221.0                                                |
| Tests                | Vitest/coverage 4.1.10, Playwright 1.62.1                                                    |
| Static quality       | ESLint 9.39.5, eslint-config-next 16.2.12, Prettier 3.9.6                                    |

All direct dependencies are exact catalog entries. New dependencies require an explicit Phase 1A
responsibility, current license/engine review, lockfile update, and advisory scan. The locked graph is
checked with `pnpm audit --audit-level critical`; the locked bootstrap graph reported no known
vulnerabilities on 2026-08-02. The audit is repeated against the complete Phase 1A graph in the final
report.

ESLint 10 and TypeScript 7 were examined and intentionally not selected: the transitive Next.js
lint plugins declare ESLint support through major 9, and `typescript-eslint` declares TypeScript
support below 6.1. The pinned versions are the newest releases inside those declared compatibility
ranges. Lifecycle scripts are fail-closed; only `esbuild` and `unrs-resolver`, both required by the
selected quality toolchain, are explicitly approved during this bootstrap.

pnpm's release-age policy recorded an explicit exception for the directly pinned and metadata-
verified `tsx@4.23.4`; transitive versions remain gated by the lockfile supply-chain check. This
exception permits only that exact release and does not relax lifecycle-script approval.

The selection does not choose a production hosting, storage, identity, secrets, telemetry, or CI
vendor. No production credentials are required or permitted.
