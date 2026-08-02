# Provider-neutral Phase 1A pipeline

`pipeline.json` is the fail-closed stage contract. `pnpm ci:verify` executes it on a Windows 11 runner without a hosting-vendor dependency, deployment, AMIGO access or paid services.

The runner needs the pinned Node.js, pnpm, PostgreSQL and RustFS prerequisites plus network access to the package advisory registry and Playwright browser distribution. Evidence is written only to ignored `.local/verification/` and can be collected by any future CI provider.
