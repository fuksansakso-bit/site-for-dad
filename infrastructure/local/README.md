# Phase 1A local infrastructure

This directory contains only the provider-neutral local Foundation contract. The executable Windows 11 lifecycle is `tooling/scripts/foundation-environment.ps1`; `runtime-grants.sql` applies least-privilege application grants after explicit Prisma and Graphile migrations.

It is not a production deployment definition. All runtime data, generated credentials, process state and logs remain under ignored `.local/foundation-environment/`.
