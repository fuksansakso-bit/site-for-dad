# Implementation dependency baseline

Verification date: **2026-08-03**. This file retains Phase 1A inputs and records the
`OWNER-DECISION-011` local/CI storage replacement; the lockfile remains the authoritative resolved dependency graph.

## Runtime and services

| Component                         |           Exact version | License/source                                                           | Verification                                                                                                                           |
| --------------------------------- | ----------------------: | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js                           |                 24.18.1 | MIT, official Node.js distribution                                       | Windows x64 archive SHA-256 `ec56b84a7551893ab2324ebdfdc4ab974a63b4781162600b68a1293cc3e53765`                                         |
| pnpm                              |                 11.18.0 | MIT, npm registry                                                        | Requires Node.js `>=22.13`; pinned in `packageManager` and the lockfile                                                                |
| PostgreSQL                        |                    18.4 | PostgreSQL License, official EDB Windows binary linked by postgresql.org | Windows x64 archive SHA-256 `02e239529ed7833d169f98d915d3feffe0813264b08b3ae353e78e8b9c97e1a6`; password-authenticated smoke passed    |
| Docker Desktop / Engine / Compose | 4.84.0 / 29.6.2 / 5.3.1 | Official Docker Windows distribution                                     | Installer SHA-256 `fe54164c1ceb9e2004137e22e4013826baccf2352c1cedb27e8daa8e56230dd7`; WSL2 Linux-container smoke passed                |
| VersityGW                         |                   1.4.1 | Apache-2.0, official Versity container image                             | `versity/versitygw:v1.4.1@sha256:0400cb59f59da0f1cf9f7fd49505191abc348dfadf54509bf1988caaff4eb96f`; POSIX named-volume contract passed |

## Application and quality toolchain

| Responsibility       | Exact selection                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| Workspace/task graph | Turborepo 2.10.8                                                                                        |
| Language             | TypeScript 6.0.3, `@types/node` 24.13.3                                                                 |
| Web/BFF              | Next.js 16.2.12, React/React DOM 19.2.8                                                                 |
| Runtime validation   | Zod 4.4.3                                                                                               |
| PostgreSQL           | Prisma/Prisma Client/adapter-pg 7.9.1, pg 8.22.0                                                        |
| Durable jobs         | Graphile Worker 0.17.3                                                                                  |
| Object storage       | AWS SDK S3 client/presigner 3.1101.0; disposable VersityGW 1.4.1 Docker/POSIX adapter                   |
| Telemetry            | OpenTelemetry API 1.9.1, Node SDK 0.221.0, OTLP HTTP trace/metric exporters 0.221.0, metrics SDK 2.10.0 |
| Tests                | Vitest/coverage 4.1.10, Playwright 1.62.1                                                               |
| Static quality       | ESLint/@eslint-js 9.39.5, typescript-eslint 8.65.0, eslint-config-next 16.2.12, Prettier 3.9.6          |

All direct dependencies are exact catalog entries. New dependencies require an explicit Phase 1A
responsibility, current license/engine review, lockfile update, and advisory scan. The locked graph is
checked with `pnpm audit --audit-level critical`; the locked bootstrap graph reported no known
vulnerabilities on 2026-08-02. The audit is repeated against the complete Phase 1A graph in the final
report.

The npm registry bulk advisory endpoint also reported zero advisory-bearing packages for all 32
direct catalog selections on 2026-08-02. This direct-version check supplements, but does not replace,
the repeated transitive lockfile audit.

ESLint 10 and TypeScript 7 were examined and intentionally not selected: the transitive Next.js
lint plugins declare ESLint support through major 9, and `typescript-eslint` declares TypeScript
support below 6.1. The pinned versions are the newest releases inside those declared compatibility
ranges. Lifecycle scripts are fail-closed; only `esbuild` and `unrs-resolver`, both required by the
selected quality toolchain, plus the exact pinned Prisma CLI/engine packages required for schema
generation and migration verification, are explicitly approved.

pnpm's release-age policy recorded an explicit exception for the directly pinned and metadata-
verified `tsx@4.23.4`; transitive versions remain gated by the lockfile supply-chain check. This
exception permits only that exact release and does not relax lifecycle-script approval.

Installing Next.js exposed advisories in its exact transitive `postcss@8.4.31` and optional
`sharp@0.34.5`. The workspace overrides PostCSS with the compatible current 8.5.25 release and omits
the unused optional Sharp dependency because Phase 1A has no image pipeline. The production build
and audit are required to pass with these controls; image processing may add a reviewed Sharp release
only in its authorized phase.

OpenTelemetry's selected Node SDK transitively installs `protobufjs@7.6.5`. Its BSD-3-Clause
package and postinstall source were inspected on 2026-08-02: the script only checks dependency
version-scheme compatibility and does not download, compile or modify project sources. That exact
lifecycle script is therefore explicitly allowed; no other newly introduced lifecycle script is
approved. OTLP export remains optional in local/test/CI, uses separate trace and metric signal paths,
and has no production collector or vendor selection.

After applying those controls, `pnpm audit --audit-level moderate` reported no known vulnerabilities
and the Next.js production build passed on 2026-08-02.

The local S3-compatible adapter selection is deliberately non-production. `s3rver@3.7.1` and the
final MinIO Community binary remain rejected for the Phase 1A dependency/security reasons recorded
in its completion report. RustFS 1.0.0-beta.11 remains historical Phase 1A evidence, but Windows 11
reproduced `HTTP 500 File access denied` at 159,099 and 262,144 bytes and on the real AMIGO media
path, so `OWNER-DECISION-011` removed it from active local/CI configuration.

VersityGW 1.4.1 is pinned by both tag and multi-platform image digest. It runs only in a Linux
container with POSIX data/versioning/IAM Docker named volumes, loopback-only endpoints, generated
credentials and all-private buckets. The 2026-08-03 gate passed 15/15 cases, exact nine-size and
515,180-byte AMIGO round trips, signed read/write, multipart complete/abort and Docker restart
persistence. This selection does not authorize VersityGW for production; `TBD-INFRA-010` and the
residency, encryption, restore and provider-replacement gates remain open.

The selection does not choose a production hosting, storage, identity, secrets, telemetry, or CI
vendor. No production credentials are required or permitted.

Graphile Worker migrations execute only through the explicit operator command. The command reapplies
runtime RLS policies and grants after every queue migration; the application role has queue data-plane
access but no schema `CREATE`. Completion/failure batching is enabled with a zero delay so graceful
shutdown flushes the library's tracked finalization batch before the PostgreSQL pool closes. Disposable
PostgreSQL verification covers repeated queue migration, runtime DDL denial, retry/timeout,
idempotency, permanent failure, process readiness and queue-lock release.
