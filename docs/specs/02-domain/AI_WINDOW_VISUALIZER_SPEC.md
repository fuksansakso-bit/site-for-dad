# AI window visualizer specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft / `BLOCKED_BY_TBD` — geometry-first contract defined; provider, benchmark thresholds, TTL/legal basis pending |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
| Standard preview | [STANDARD_INTERIOR_PREVIEW_SPEC.md](STANDARD_INTERIOR_PREVIEW_SPEC.md) |
| Technical pipeline | [AI_PIPELINE.md](../04-technical/AI_PIPELINE.md) |

## 1. Назначение and boundaries

AI visualizer privately places an exact selected product/material onto a user-confirmed window in the user's photo. Base geometry rendering is authoritative and usable without generative AI. Optional refinement may improve blending only under strict invariants.

In scope: notice/upload validation, window/sash detection, user selection/correction, masks/perspective/occlusion, exact material rendering, multiple sashes, product position, optional refinement, before/after, project attachment, WhatsApp-safe reference, deletion and quality evaluation.

Out of scope: precise measurement from photo, installation feasibility guarantee, room redesign, changing product/SKU/material, training on production images, public gallery, provider choice and physical color guarantee.

## 2. Actors, permissions and data classification

Guest/customer owns the private photo graph. AI worker has job-scoped access. Manager access is not automatic and requires an approved support purpose/policy. Admin/content roles cannot browse client media. Storage/AI subprocessors receive minimum permitted data.

All originals, stripped originals, thumbnails, masks, geometry points, intermediate layers, prompts/requests, outputs and metadata capable of reconstructing a room are `PRIVATE_USER_MEDIA` or sensitive derivatives. Object URLs and contents are excluded from logs, analytics, errors and test fixtures.

## 3. Нормативные требования

- **AIVIS-SPEC-001 — MUST:** upload begins only after clear purpose/processing/retention/provider notice and required consent/legal-basis flow.
- **AIVIS-SPEC-002 — MUST:** input validation checks authorization, file signature/MIME, approved formats, size/dimensions, decode, orientation, malware and minimum quality.
- **AIVIS-SPEC-003 — MUST:** prohibited metadata is removed before downstream processing; original handling follows approved retention.
- **AIVIS-SPEC-004 — MUST:** automatic detection never silently chooses the final window when multiple candidates or low confidence exist; user confirms target.
- **AIVIS-SPEC-005 — MUST:** user can correct at least four perspective points and, where needed, masks/occlusions/sashes using accessible alternatives.
- **AIVIS-SPEC-006 — MUST:** geometry state stores normalized coordinates relative to oriented image, source dimensions, transform version and user confirmation.
- **AIVIS-SPEC-007 — MUST:** exact selected `MaterialVariant` and product render profile revisions are used; substitution/generative recoloring is prohibited.
- **AIVIS-SPEC-008 — MUST:** base render preserves perspective, window frames, handles and foreground occlusions and supports confirmed multiple sashes.
- **AIVIS-SPEC-009 — MUST:** product position/open percentage/slat angle/stripe phase changes only through supported controls and versioned rules.
- **AIVIS-SPEC-010 — MUST:** base geometry render remains available when generative provider is disabled, unavailable or rejected.
- **AIVIS-SPEC-011 — MUST:** optional refinement receives minimum constrained input and cannot alter protected regions, product identity, material pattern/category or geometry beyond approved tolerance.
- **AIVIS-SPEC-012 — MUST:** refinement output is compared against base invariants; failing output is discarded and never replaces base.
- **AIVIS-SPEC-013 — MUST:** outputs are labelled illustrative; AI-refined revision is distinguishable from deterministic base.
- **AIVIS-SPEC-014 — MUST:** every result traces photo revision, geometry/masks, configuration/material/assets, renderer/model/provider versions and quality checks.
- **AIVIS-SPEC-015 — MUST:** storage and delivery are private, short-lived/authorized and never public bucket/CDN.
- **AIVIS-SPEC-016 — MUST:** training/fine-tuning/evaluation use of production client or AMIGO media is prohibited without separate lawful basis and explicit permission; default is no training.
- **AIVIS-SPEC-017 — MUST:** delete/TTL traverses original, normalized copy, thumbnail, masks, intermediates, requests, outputs, shares and jobs idempotently.
- **AIVIS-SPEC-018 — MUST:** WhatsApp/project attachment uses opaque application reference and allowed thumbnail/summary, never storage URL.
- **AIVIS-SPEC-019 — MUST:** low confidence/unsupported geometry offers manual correction or clear failure, never fabricated successful preview.
- **AIVIS-SPEC-020 — MUST:** quality thresholds are approved through evaluation; no invented numeric threshold is encoded in this spec.
- **AIVIS-SPEC-021 — MUST:** user can compare original/base/refined revisions and revert to base without changing configuration.
- **AIVIS-SPEC-022 — MUST:** photo is not required for catalog, quote, cart or contact flow.

## 4. Data model and fields

| Entity | Key fields |
|---|---|
| `PhotoUpload` | owner scope, purpose/notice/consent version, object ref, hash, MIME/dimensions/orientation, created/expiry/deletion status |
| `PhotoRevision` | parent, normalization transform, stripped metadata status, private derivatives |
| `WindowCandidate` | model version, polygon/bbox, confidence, sash candidates, status |
| `ConfirmedGeometry` | selected candidate, normalized corner points, sash polygons, user edits/confirmation, version |
| `MaskSet` | glass/product/protected frame/handle/foreground masks, model/manual sources, checksum |
| `VisualizationJob` | type/stage/state/idempotency/correlation, private input/output refs, retry/provider metadata |
| `VisualizationRevision` | base/refined kind, configuration/material/asset/profile/model versions, controls, invariant report, disclosure |
| `ShareAttachment` | opaque scoped reference, allowed summary/thumbnail policy, expiry/revocation |
| `DeletionTask` | graph roots, object/job/provider deletion states, attempts/evidence |

## 5. Primary flow

1. User selects valid product configuration and invokes personal visualization.
2. Product displays notice and accepts supported private upload.
3. Worker validates/normalizes/strips metadata; invalid inputs are rejected and cleaned.
4. Detection returns one or more window/sash candidates and confidence metadata.
5. User chooses target and confirms/corrects four+ points, sash boundaries and occlusions where needed.
6. System produces versioned masks and perspective transform.
7. Base renderer projects exact product geometry/material and applies protected/foreground layers.
8. Automated quality invariants and user-visible review run; result becomes `READY_BASE` or returns correction/failure.
9. User adjusts supported product state and compares before/base.
10. If explicitly requested and permitted, constrained generative refinement creates a separate candidate.
11. Candidate passes invariant/quality check or is discarded; base remains.
12. User attaches opaque revision to project/quote and optionally handoff; deletes at will/TTL.

## 6. Geometry and coordinate contract

All points are stored normalized `[0,1]` relative to the correctly oriented image plus original pixel dimensions and orientation transform. Quadrilateral ordering is canonical and self-intersection invalid. Multiple sashes have distinct IDs/polygons and target product assignment.

Perspective transform maps a canonical product plane to target quadrilateral. Masks separate target glass/product region, protected frame/handle, and foreground occlusion. Geometry revision includes creation source (`MODEL`, `USER`, `HYBRID`), detector/editor versions and confirmation timestamp.

Irregular/roof/arched windows need explicit geometry profiles; unsupported shapes route manual/unsupported state, not approximation presented as accurate.

## 7. Product rendering behavior

Renderer uses catalog `ProductRenderProfile` and `MaterialRenderProfile`. It handles family-specific geometry:

- roller: plane/roll/cassette/lower bar/open percentage;
- Zebra: band scale/phase and open/closed alignment;
- horizontal/vertical: slat/lamella width, angle and stacking only when profile approved;
- pleated/cellular: fold/compression profile;
- complex/soft products/ZIP/roof/shutters only after profile and benchmark readiness.

Selected material asset is sampled/warped with approved scale/orientation/transparency. Generative model cannot synthesize a different pattern or hide hardware.

## 8. Optional generative refinement contract

Allowed purpose: local blending, edge/lighting harmonization and limited occlusion cleanup. Protected invariants:

- window/frame/handle/room structure outside allowed blend band;
- product quadrilateral/geometry and visible hardware/control;
- selected material pattern/texture/color identity within approved metric/tolerance;
- count/shape of sashes and product instances;
- no new objects, text, logo, watermark or room redesign.

Provider request is ephemeral/minimal, identifies no user where possible, disables provider training/retention under contract, and uses no AMIGO asset for provider training. Exact provider/region/retention remains evaluation/ADR gated.

## 9. States and transitions

| State | Meaning / allowed next |
|---|---|
| `NOTICE_REQUIRED` | Show notice; accept/cancel |
| `UPLOADED` | Private object received; validate/delete |
| `VALIDATING` | Decode/security/quality; `REJECTED` or `DETECTING` |
| `DETECTING` | Candidates; `CORRECTION_REQUIRED` or `GEOMETRY_CONFIRMED` |
| `CORRECTION_REQUIRED` | User edit/retry/cancel |
| `GEOMETRY_CONFIRMED` | Create masks/base job |
| `RENDERING_BASE` | `READY_BASE`, `CORRECTION_REQUIRED`, `FAILED` |
| `READY_BASE` | Compare/attach/refine/delete |
| `REFINING` | `READY_REFINED` or return `READY_BASE` |
| `READY_REFINED` | Compare/attach/revert/delete |
| `FAILED/REJECTED` | Explain/retry/delete |
| `EXPIRED/DELETION_PENDING/DELETED` | No new access; idempotent cleanup |

## 10. Validation and quality invariants

Input: supported file and decode; dimensions/quality sufficient; no dangerous payload; actor owns job. Geometry: ordered nondegenerate polygon, bounds, sensible transform, confirmed target, mask alignment. Product: correct family/system/material revision and rights. Output: protected-region change below approved tolerance, expected product region coverage, material identity metric, no NaN/transparent leak, safe format/metadata.

Quality evaluation dimensions:

- window detection/selection success;
- corner/sash/mask accuracy;
- frame/handle/foreground preservation;
- perspective/scale/product geometry plausibility;
- material/SKU identity and pattern fidelity;
- artifacts/edge/blending realism;
- user correction effort and task success;
- failure detection/calibration rather than forced result;
- performance/cost/privacy by pipeline stage.

Exact datasets, sample sizes and thresholds are governed by [AI_EVALUATION_SPEC.md](../../evaluations/AI_EVALUATION_SPEC.md) and `TBD-AI-*`.

## 11. Errors, edge cases and recovery

| Code | Trigger | Safe behavior |
|---|---|---|
| `UPLOAD_UNSUPPORTED/UNSAFE` | Format/signature/malware/decode | Reject and cleanup |
| `PHOTO_LOW_QUALITY` | Blur/dark/glare/crop | Guidance and retry |
| `NO_WINDOW/MULTIPLE_WINDOWS` | Detection uncertain | Manual selection/correction |
| `GEOMETRY_INVALID` | Points/mask/transform invalid | Editor guidance, no render |
| `PRODUCT_PROFILE_UNSUPPORTED` | Family/system not ready | Standard preview/contact |
| `ASSET_BLOCKED` | Rights/mapping changed | Stop job/invalidate output |
| `BASE_RENDER_FAILED` | Renderer failure | Retry/manual support, no refinement |
| `PROVIDER_UNAVAILABLE` | Refinement dependency | Keep base |
| `REFINEMENT_DRIFT` | Invariant failed | Discard candidate, keep base |
| `ACCESS_DENIED/EXPIRED` | Ownership/token/TTL | Neutral response, no leak |
| `DELETE_PARTIAL` | Object/provider/job cleanup retry | Access remains revoked; retry/alert |

Edge cases: multiple windows/sashes, reflections, curtains/plants, bars/screens, open windows, tilted perspective, panoramic/portrait, EXIF rotation, very high resolution, transparent fabric, fine Zebra bands, faces/documents in scene, duplicate uploads, deletion during job, provider completion after delete, asset revoke after output, account claim/merge and accessible point editing.

## 12. Security and privacy

Upload uses authenticated/scoped endpoint, allowlisted decode pipeline, malware/content checks where approved, rate/size limits and random private object keys. Delivery is short-lived and owner/purpose checked. Workers run least privilege; egress only approved providers; secrets isolated. Logs/traces store IDs, stages, durations, model versions and error codes, never pixels/URLs/prompts containing scene data. Backups, subprocessors, legal basis, guest TTL, consent withdrawal and DSAR remain policy/TBD gated.

## 13. Performance and analytics

Stages are asynchronous with progress/cancel and idempotency. Large image normalization precedes expensive work; bounded derivatives, queue limits, timeout/circuit breaker and base/refinement separation protect resources. Numeric budgets remain in `PERFORMANCE.md`/evaluation after measurement.

Analytics: opt-in/approved events for upload started/validated/rejected reason class, correction needed, base ready, refinement requested/accepted/discarded, attach/delete and stage latency/cost. No content, exact coordinates, object URLs or private free text.

## 14. Acceptance criteria and test scenarios

Primary: `AC-AI-UPLOAD-001`, `AC-GEOMETRY-001`, `AC-AI-VIS-001`, `AC-AI-REFINE-001`, `AC-VIS-DELETE-001`, `AC-PRIV-001`, `AC-SEC-001`, `AC-ACCESS-001`.

Tests: file spoof/malware/decompression; EXIF/orientation; poor/multiple/no-window; manual corners/keyboard editor; multi-sash/occlusion; exact material mapping; protected-region/geometry/pattern metrics; provider outage/timeout/drift; retry/idempotency; cross-owner/object URL; delete during each stage/late callback/backups; asset revoke; reduced motion/responsive; benchmark regression.

## 15. Dependencies, risks and open questions

Dependencies: configurator/catalog/media/storage/AI pipeline/security/API/accounts/performance/observability/evaluation. Open: `TBD-AI-001`–`009`, `TBD-PRIV-*`, guest TTL, provider/region/retention, dataset rights, benchmark thresholds, maximum file/queue/time, complex family readiness. Risks: privacy leak, wrong material, geometry fabrication, provider retention/training, generative drift, inaccessible editor, late output after deletion and cost/latency abuse.

## 16. Связанные требования и история

Links: `FR-VIS-001`–`022`, `FR-AI-VIS-001`, `NFR-PRIV-*`, `NFR-SEC-*`, `NFR-UPLOAD-*`, `ASSET-*`, `AIVIS-SPEC-001`–`022`.

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Определены private geometry-first flow, data graph, optional constrained refinement, quality dimensions, deletion and failure behavior. |
