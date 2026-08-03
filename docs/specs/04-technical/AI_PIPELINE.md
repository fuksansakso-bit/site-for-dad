# AI and computer-vision pipeline specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft / `BLOCKED_BY_TBD-AI-*` — provider/model thresholds not selected; pipeline and fallbacks defined |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
| Product behavior | [AI_WINDOW_VISUALIZER_SPEC.md](../02-domain/AI_WINDOW_VISUALIZER_SPEC.md) |
| Evaluation | [AI_EVALUATION_SPEC.md](../../evaluations/AI_EVALUATION_SPEC.md) |

## 1. Purpose and boundaries

This specification decomposes client-photo processing into safe deterministic/ML stages and provider adapters. The base result is geometry-first; generative refinement is optional and discardable. No AI API is connected and no provider is selected in 0B.

Out of scope: training/fine-tuning, ingesting production photos into datasets, autonomous product recommendation, measurement guarantee, room redesign and generative replacement of exact material/SKU.

## 2. Pipeline stages

| Stage | Input | Output / gate |
|---|---|---|
| Intake validation | Job-scoped private upload | Safe decoded normalized photo or reject |
| Quality assessment | Normalized photo | Blur/light/glare/crop/size signals and guidance |
| Window/sash detection | Photo derivative | Candidate polygons/boxes/confidence/model version |
| User confirmation/editor | Candidates/photo | Confirmed normalized geometry and edits |
| Segmentation/masks | Geometry/photo | Glass/product/protected/handle/foreground masks |
| Product geometry | Config/render profile/controls | Canonical product layers projected to target |
| Material mapping | Exact asset/render profile | Warped scaled texture/slats/stripes |
| Deterministic composition | Layers/masks/photo | Base visualization revision |
| Invariant/quality gate | Base vs input/config | Pass/correct/fail report |
| Optional refinement | Minimal constrained base/context | Candidate refined revision |
| Refinement gate | Candidate/base/input | Accept separate revision or discard |
| Persist/deliver/delete | Approved output refs | Private result/attachment or cleanup |

## 3. Нормативные requirements

- **AI-PIPE-001 — MUST:** every pipeline run pins stage code/model/provider/profile/asset/configuration/geometry versions and purpose.
- **AI-PIPE-002 — MUST:** AI worker receives only job-scoped private references and minimum metadata, never broad account/catalog/admin access.
- **AI-PIPE-003 — MUST:** input is validated/normalized/metadata-stripped before ML/provider; unsafe or unsupported file is rejected.
- **AI-PIPE-004 — MUST:** automatic candidates/confidence are advisory; final target geometry requires user confirmation when ambiguity/low confidence or product policy demands.
- **AI-PIPE-005 — MUST:** normalized coordinate and transform conventions are consistent/reproducible across detector/editor/renderer revisions.
- **AI-PIPE-006 — MUST:** protected frame/handle/foreground masks and exact material/product profiles are explicit inputs to deterministic composition.
- **AI-PIPE-007 — MUST:** exact partner material asset is not sent for provider training and cannot be replaced/reinterpreted by a generative model.
- **AI-PIPE-008 — MUST:** base renderer is provider-independent and remains result/fallback when detector/refinement provider fails.
- **AI-PIPE-009 — MUST:** optional refinement starts only from a ready base under approved provider/privacy/region/retention contract and explicit user action/policy.
- **AI-PIPE-010 — MUST:** provider request is minimized, encrypted, time-bounded and excludes user identity/object URL/source credentials/unneeded room regions where possible.
- **AI-PIPE-011 — MUST:** provider training/retention is disabled contractually/configurationally where used; unverified policy blocks production use.
- **AI-PIPE-012 — MUST:** callback/polling response authenticates provider/job/version, is replay/idempotency protected and is discarded after delete/cancel/expiry.
- **AI-PIPE-013 — MUST:** every stage has timeout, retry class, maximum policy, cancellation and typed failure; retries cannot duplicate or overwrite newer revision.
- **AI-PIPE-014 — MUST:** quality/invariant thresholds are versioned evaluation decisions; no hidden model confidence default marks success.
- **AI-PIPE-015 — MUST:** refinement changes outside allowed mask/tolerance, material/geometry drift or unsafe artifact cause discard, not warning-only acceptance.
- **AI-PIPE-016 — MUST:** input/intermediate/output content and private URLs never enter logs/traces/analytics/error reports.
- **AI-PIPE-017 — MUST:** deletion tombstone is checked before read, stage transition, provider submit, callback commit and delivery.
- **AI-PIPE-018 — MUST:** model/provider rollout is gated by benchmark, privacy/security/cost/latency evaluation, canary/shadow on rights-cleared data and rollback.
- **AI-PIPE-019 — MUST:** production inputs are not reused for offline evaluation/debug/demo without separate permission/basis; incidents use minimized controlled evidence.
- **AI-PIPE-020 — MUST:** queue isolation, quotas and backpressure prevent AI workloads from degrading catalog/cart/contact.

## 4. Job and artifact contract

`VisualizationJob`: job ID/type (`VALIDATE`, `DETECT`, `SEGMENT`, `RENDER_BASE`, `REFINE`, `DELETE`), owner/purpose, input/output artifact refs, config/material/profile/geometry/model versions, state/stage, idempotency/correlation/causation, priority/deadline, attempts/error code, cancellation/deletion flags, provider request ref safe, timestamps and cost/quality metadata.

Artifacts are typed private objects with parent/stage/model/profile/hash/classification/expiry. Worker never accepts arbitrary client storage key. Stage commits new immutable artifact/revision and checks expected current state.

## 5. Input normalization and quality

Decode in isolated bounded environment; verify file signature, dimensions/pixel count/color/orientation, remove metadata and create working derivative. Quality assessment MAY measure blur, brightness, glare, occlusion and window visibility. Thresholds come from evaluation/user task success; low quality returns specific guidance and does not automatically upload to external provider.

## 6. Detection, segmentation and editor handoff

Detector outputs candidate ID, bbox/polygon, sash proposals, confidence/calibration, model version and warnings. Multiple/no/low-confidence outcomes request selection/manual editor. Model never returns final physical dimensions.

Mask generator outputs coordinate-aligned masks with source (`MODEL`, `USER`, `HYBRID`) and checksum. User edits produce new geometry/mask revision; model artifacts remain for evaluation only under permitted retention and do not override user-confirmed points.

## 7. Deterministic product rendering

Renderer resolves supported family profile, exact material/hardware assets and confirmed geometry. It creates product-specific layers, perspective warp, repeated texture/stripes/slats, transparency, hardware/control and occlusion composition. It preserves protected regions and records controls. Unsupported family/profile or missing asset fails to standard preview/manual path.

Base output is checked for bounds, alpha/format, geometry/mask alignment, product region coverage, protected-region difference and asset/config identity. It is labelled illustrative and private.

## 8. Generative refinement adapter

Provider-neutral interface:

- capability/config/privacy/region health;
- submit constrained refinement job with allowed mask/base/protected reference/profile;
- get/poll/cancel/delete provider artifact;
- report model/version/seed/config/usage/latency/cost/retention status;
- typed transient/permanent/policy/safety failures.

Prompt/text template is versioned internal config with no user identity/source secret. It instructs no product/material/geometry/room changes but prompts are not security controls; post-invariant gate is mandatory.

## 9. Invariant and quality gates

Machine metrics plus human/user review:

- protected-region difference;
- target geometry corner/edge alignment;
- sash/instance count and product region overlap;
- material embedding/feature/pattern/color/texture similarity on allowed region;
- artifact/edge/occlusion quality;
- output safety/content corruption;
- detector confidence calibration and correction effort;
- user preference/task success, not aesthetics alone.

Thresholds, benchmark sets and acceptance rules live in evaluation spec. Failure yields `CORRECTION_REQUIRED`, `READY_BASE_ONLY`, `UNSUPPORTED` or `FAILED`, never automatic best-effort ready.

## 10. State, retry and cancellation

Jobs use created/queued/running/waiting-user/waiting-provider/succeeded/failed/cancel-requested/cancelled/deletion-pending/deleted. Stage transition requires current version and deletion false. Transient network/provider throttling retries with bounded backoff/jitter; validation/policy/drift are permanent until input/config changes. User cancel stops future work and discards late output. Idempotency key includes job type + exact input/model/profile revisions.

## 11. Security and privacy

Workers are isolated, least privilege, no broad outbound network; provider egress allowlisted. Inputs/outputs encrypted and private. Secrets use secret manager/equivalent and rotate. Provider contract review covers region/subprocessors/training/retention/deletion/incident/exit. Prompt injection in images/text is treated as untrusted content; AI output never invokes tools/commands or changes domain state without validation.

## 12. Performance, cost and observability

Normalize before expensive stages; reuse exact safe stage artifact by hash/version/owner policy; do not reuse across users without rights/privacy decision. Separate base/refinement queues and quotas. Timeouts/circuit breakers and coarse progress protect UX. Metrics by stage/model/version: queue/run latency, success/failure/correction, retry, memory/compute, provider cost, artifact sizes, quality distributions and deletion age. No pixels/coordinates/object URLs.

## 13. Errors and edge cases

Cases: EXIF rotation, huge/decompression image, multiple/zero windows, reflections/dark/glare, frame/handle/curtain/plant, multi-sash, complex shapes, exact texture not tileable, transparent/Zebra fine patterns, provider throttling/region outage, model version removed, callback replay/out-of-order, deletion during submit, provider returns after delete, asset rights revoked mid-job, user edits while job runs and job result stale. Each has explicit fail/cancel/new-revision behavior.

## 14. Acceptance and tests

Primary: `AC-AI-UPLOAD-001`, `AC-GEOMETRY-001`, `AC-AI-VIS-001`, `AC-AI-REFINE-001`, `AC-VIS-DELETE-001`, `AC-PRIV-001`.

Tests: isolated file validation; detector/mask benchmark; editor handoff/version; deterministic renderer replay; exact asset/profile; protected/material/geometry invariants; provider adapter contract/outage/throttle/callback auth/replay; delete/cancel every stage/late response; telemetry scan; queue isolation/quota; model canary/rollback and rights-cleared evaluation fixtures.

## 15. Dependencies, risks and open questions

Dependencies: visualizer/catalog/media/storage/API/security/performance/observability/evaluation/deployment and AI ADR. Open: `TBD-AI-*`, provider/model/region, benchmark/data rights/thresholds, file/queue/timeout/cost budgets, editor usability and complex family support. Risks: private leakage, training/retention, drift/material substitution, confident wrong geometry, cost/latency abuse, late resurrection and vendor lock-in.

## 16. History

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Defined stage/job/artifact contracts, deterministic base, optional provider refinement, invariants, deletion and evaluation gates. |
