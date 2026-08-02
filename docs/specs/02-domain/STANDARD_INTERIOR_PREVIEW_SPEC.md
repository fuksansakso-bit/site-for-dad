# Standard interior preview specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft 0B — deterministic renderer contract defined; scene/asset inventory pending |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
| Configuration | [PRODUCT_CONFIGURATOR_SPEC.md](PRODUCT_CONFIGURATOR_SPEC.md) |
| Separate private flow | [AI_WINDOW_VISUALIZER_SPEC.md](AI_WINDOW_VISUALIZER_SPEC.md) |

## 1. Назначение и границы

Standard preview shows the selected source-backed product/material on a controlled demonstration interior/window without a client photo and without generative AI. It provides immediate deterministic visual feedback, not measurement proof or guarantee of physical color/scale.

In scope: scene profiles, family-specific product geometry, layer composition, exact asset mapping, interactive position/light/view variants, deterministic revisions, accessible summary and export/share-safe output.

Out of scope: client-photo detection, personalized geometry, production renderer technology, automatic source hotlink, photometric/color guarantee and AI refinement.

## 2. Actors, roles and permissions

Guest/customer reads and changes preview controls for owned configuration. Content manager registers scenes/product/material assets. Catalog admin publishes renderer profiles/mappings. Renderer worker may access only public-approved assets and a job/configuration reference. Standard output contains no private data by design.

## 3. Terms and scene model

| Entity | Purpose |
|---|---|
| `SceneProfile` | Versioned room/window background, geometry, lighting presets and supported product families |
| `WindowGeometryProfile` | Opening/frame/glass/handle/occlusion polygons and reference dimensions |
| `ProductRenderProfile` | Family/system layer/geometry/behavior mapping |
| `MaterialRenderProfile` | Asset, repeat/scale/orientation/color-space and transparency mapping |
| `PreviewRevision` | Immutable inputs, renderer/profile/asset versions, controls and output/checksum |
| `ProtectedLayer` | Scene part that product cannot overwrite (frame, handle, foreground) |

## 4. Нормативные требования

- **STD-PREV-001 — MUST:** preview uses no client upload and no generative AI; it is independently available from AI visualizer.
- **STD-PREV-002 — MUST:** input is one valid configuration revision and explicitly supported Scene/Product/Material profile revisions.
- **STD-PREV-003 — MUST:** material texture comes from the exact mapped `MaterialVariant` asset with permitted rights/publication state; substitution is prohibited.
- **STD-PREV-004 — MUST:** source images are delivered from managed local storage; hotlink is prohibited.
- **STD-PREV-005 — MUST:** output reflects family/system-specific geometry, selected hardware color, control side/type and supported position.
- **STD-PREV-006 — MUST:** material repeat, scale, orientation, transparency and stripe behavior are profile data with evidence/review, not guessed per render.
- **STD-PREV-007 — MUST:** frame, handle and foreground layers remain protected according to scene masks.
- **STD-PREV-008 — MUST:** same inputs/profile/assets/renderer version produce semantically identical deterministic output/checksum within declared platform tolerance.
- **STD-PREV-009 — MUST:** changes create a new PreviewRevision and never mutate configuration or earlier output.
- **STD-PREV-010 — MUST:** unsupported system/material/profile yields honest fallback and textual summary, never wrong visualization.
- **STD-PREV-011 — MUST:** preview visibly states that scene is illustrative and final appearance depends on screen/light/measurement.
- **STD-PREV-012 — MUST:** control interactions are operable by keyboard/touch and have screen-reader labels/value announcements.
- **STD-PREV-013 — MUST:** motion/transition respects reduced motion and is not required to understand selection.
- **STD-PREV-014 — MUST:** export/share contains configuration/preview opaque reference or safe raster plus approved attribution; no internal storage/source URL.
- **STD-PREV-015 — MUST:** scene/profile publication and rollback are versioned, approved and audited.
- **STD-PREV-016 — MUST:** public output cannot imply AMIGO example is a PROJECT_NAME completed work.

## 5. Input/output contract

Input fields:

`configurationRevisionId`, family/system/model/material variant and asset revisions, hardware/control/options, preview control values, `sceneProfileId/revision`, requested viewport/export size, locale/accessibility preferences and idempotency key.

Output fields:

`previewRevisionId`, status, input checksum, renderer/profile/asset versions, output asset reference/derivatives, accessible text summary, warnings/disclosure, created/expiry/cache metadata and typed errors. Public outputs may be cacheable; project attachment retains revision reference.

## 6. Layer composition

Canonical back-to-front order:

1. interior/background and window recess;
2. outside/glass light layer;
3. back product components, mounts and cassette/rail as applicable;
4. product fabric/slats/stripes with perspective/scale/transparency;
5. front hardware/control components;
6. protected frame/handle;
7. foreground furniture/plant/curtain occlusions;
8. optional UI-only measurement/selection guides, excluded from final export;
9. disclosure/attribution outside image or in approved presentation layer.

Each layer has coordinate space, blend/opacity policy, clipping mask, color-space, asset revision and family applicability. Unknown ordering blocks profile approval.

## 7. Family behavior profiles

| Family | Required visual behavior | Special risk |
|---|---|---|
| Roller | Fabric plane, roll/cassette, lower bar, open percentage | Repeat scale/transparency |
| Zebra | Alternating bands and relative alignment/open state | Incorrect stripe phase/material identity |
| Pleated/cellular | Fold/cell geometry and compression | Texture repetition/unsupported detail |
| Horizontal | Slat width/angle, ladder/controls | Aliasing, occlusion and real spacing |
| Vertical | Lamella width/rotation/stack side | Large count/performance and overlap |
| Mirage | Source-specific layered geometry | Mapping uncertainty |
| Roman/drapery | Fold/drape state | Cannot fake soft-body behavior without profile |
| Roof/ZIP/shutters | Frame/guide/section geometry | Deferred until verified profile |

Unsupported family remains available in catalog/configuration according to readiness but gets a static product/material fallback, not a generic roller shape.

## 8. Scene profiles and controls

Minimum conceptual scene set: neutral modern interior with standard window; additional scene/light presets are content assets, not required for parity. Each profile contains aspect/viewport variants, window reference geometry, protected masks, color profile, light presets, product anchor and supported family list.

Controls MAY include scene, day/night or light preset, view framing, open/closed percentage, slat angle/stripe alignment where supported, zoom and before/neutral comparison. Controls cannot alter product identity or price inputs silently; price-affecting changes must return to configurator.

## 9. State machine and transitions

`REQUESTED → VALIDATING → LOADING_ASSETS → RENDERING → VERIFYING → READY`; failures can yield `UNSUPPORTED`, `FAILED` or `CANCELLED`; old outputs can become `SUPERSEDED`, `EXPIRED`, `BLOCKED`, `DELETED`.

- profile/asset revocation moves delivery to `BLOCKED` and invalidates cache;
- retry with same idempotency key reuses or resumes result;
- configuration change starts a new request and marks previous attachment superseded, not deleted;
- export is derived from one ready revision and retains parent relationship.

## 10. Validation and invariants

- configuration is valid and exact family/system/material revisions exist;
- all assets are local, intact by hash and publication-approved;
- scene supports family/product render profile;
- material scale/orientation/transparency values are within approved bounds;
- protected masks and anchors fit scene coordinate space;
- control values are supported and bounded;
- renderer/profile version is known and enabled;
- output dimensions/format safe and do not expose alpha/mask/source unintended data;
- textual summary lists exact selected product/material/hardware and disclosure;
- no private project/photo information appears in cache key/export metadata.

## 11. Errors, edge cases and failure behavior

| Code | Case | Behavior |
|---|---|---|
| `PROFILE_UNSUPPORTED` | Family/system no approved profile | Text/product image fallback |
| `ASSET_MISSING/BLOCKED` | Exact material/hardware unavailable | Do not substitute; contact/choose other |
| `PROFILE_CONFLICT` | Scene/product/material revisions incompatible | Block render and alert content/data owner |
| `RENDER_FAILED` | Worker/browser/GPU failure | Retry/static fallback; config preserved |
| `OUTPUT_INVALID` | Invariant/visual validation fails | Quarantine result |
| `VERSION_CONFLICT` | Profile revoked/changed mid-job | Finish pinned safe version or cancel per policy |

Edge cases: transparent/light fabric, very fine stripes, long vertical lamella count, dark hardware on dark frame, missing handle mask, wide/tall viewport crop, zoom 400%, RTL text (if future), print/export, asset revoke after share and old browser cache. Each has visual/functional tests.

## 12. Security, privacy, performance and analytics

Public assets are rights-approved; renderer has no partner credentials or private-photo access. Export metadata is sanitized. CSP/media delivery and integrity checks apply. Preview code/assets lazy-load on intent; scene/asset/renderer revisions make cache safe; large textures use approved derivatives while originals stay managed. Performance budgets and device fallback live in `PERFORMANCE.md`.

Analytics: preview requested/ready/failed/unsupported, scene/control use, time-to-first-ready, fallback, export/attach/cart conversion, all keyed to non-sensitive product/profile revisions. No pixel/image payload in analytics.

## 13. Acceptance criteria and tests

Primary: `AC-STANDARD-PREVIEW-001`, `AC-ASSET-MAP-001`, `AC-ACCESS-001`, `AC-PERF-001`.

Tests: exact variant mapping; deterministic snapshots; family profiles; control bounds; protected layers; transparency/pattern scale; asset/profile revoke; unsupported fallback; keyboard/screen reader/reduced motion; responsive/export; cache key/invalidation; no client-photo/AI request; security metadata; visual regression across approved browsers/devices.

## 14. Dependencies, risks and open questions

Dependencies: catalog/configurator/media/storage/data/API/UX/performance/testing. Open: scene list/assets, exact product geometry profiles, color management, export formats/sizes/retention, advanced family readiness and rights/attribution details (`TBD-ASSET-AMIGO-003`). Risks: wrong material, misleading scale/color, generic shape for unsupported family, protected-layer overwrite, stale revoked asset, inaccessible canvas and heavy initial load.

## 15. Связанные требования и история

Links: `FR-STANDARD-PREVIEW-001`–`008`, `FTR-012/013`, `ASSET-*`, `STD-PREV-001`–`016`.

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Определены deterministic renderer profiles, layers, family behaviors, state/errors, accessibility, export and tests. |
