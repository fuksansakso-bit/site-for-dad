# Standard interior preview specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 1D preview passed; Phase 1E quote-backed cart handoff implemented |
| Версия | 0.4.0 |
| Дата | 2026-08-09 |
| Configuration | [PRODUCT_CONFIGURATOR_SPEC.md](PRODUCT_CONFIGURATOR_SPEC.md) |
| Separate private flow | [AI_WINDOW_VISUALIZER_SPEC.md](AI_WINDOW_VISUALIZER_SPEC.md) |

## 1. Назначение и границы

Standard preview shows the selected source-backed product/material on a controlled demonstration interior/window without a client photo and without generative AI. It provides immediate deterministic visual feedback, not measurement proof or guarantee of physical color/scale.

Implemented in Phase 1D: two approved locally mirrored photoreal partner scene profiles, family-specific supplier atlases, layered SVG rendering, exact variant-to-layer mapping or labelled evidence fallback, interactive position/view variants, mutable ownership-scoped `StandardPreviewState`, accessible summary and deterministic visual baselines. `OWNER-DECISION-015` records the partner permission and photoreal requirement; no supplier frontend code is reused.

Out of scope: client-photo detection/upload, personalized geometry, raster export/share, remote background loading, automatic source hotlink, photometric/color guarantee and AI refinement.

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
| `StandardPreviewState` | Versioned guest-owned working state linked to a validated server-side pricing calculation or immutable quote without mutating either |
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
- **STD-PREV-017 — MUST:** Phase 1D visual evidence is classified as `EXACT_SWATCH`, `PRODUCT_IMAGE_CROP`, `NORMALIZED_COLOR_ONLY` or `PREVIEW_UNAVAILABLE` in that priority order; color-only and unavailable states are explicitly disclosed.
- **STD-PREV-018 — MUST:** public preview state uses an opaque server-generated ID and guest-owner secret, validates every update by family schema, is private/no-store, and never accepts an arbitrary remote asset URL.
- **STD-PREV-019 — MUST:** Phase 1D supports Roller, Zebra, horizontal aluminium and vertical profiles; every other family returns `PREVIEW_UNAVAILABLE`, not invented geometry.
- **STD-PREV-020 — MUST:** opening, Zebra alignment, slat angle, vertical spread, scene and zoom controls change preview state only and MUST NOT affect price; a real price option is revalidated by the configurator first.

## 5. Input/output contract

Phase 1D input fields:

Opaque `pricingCalculationToken` or `quoteSnapshotToken`, family/system/model/material variant and approved asset revisions resolved server-side, hardware/control/options, bounded preview controls, `sceneProfileId`, renderer version, owner cookie, correlation and idempotency key.

Phase 1D output fields:

`previewStateId`, eligibility/status, deterministic input checksum, renderer/scene/asset versions, exact same-origin asset reference when available, asset-quality classification, accessible summary, warnings/disclosure and timestamps. State responses are private/no-store; state-owned product-layer responses remain private and checksum validated, while non-private immutable scene bytes use version-pinned caching.

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

Phase 1D publishes two approved local photoreal scene profiles: `WINDOW_CLOSEUP` and `ROOM_WINDOW`. Each is a checksum-bound 1500×937 partner-licensed background composed inside the project's own responsive SVG UI with stable viewBox/window anchors and supported-family registry. Later living room, bedroom, kitchen, office, light/dark and day/evening variants can be added as approved data without changing renderer selection. The Zebra 5992 right-sash layer uses the manifest-recorded deterministic perspective rectification, not generated or random pixels.

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

Dependencies: catalog/configurator/media/storage/data/API/UX/performance/testing. Phase 1D implementation and visual evidence close the initial scene/profile/family aspect of `TBD-PREVIEW-001`; unimplemented export and broader content profiles remain outside this phase. The registered partner-license basis, source URL, checksum, publication state and derived-layer provenance apply to every current preview asset. Risks remaining for later work: exact swatch gaps, misleading physical color/scale, stale revoked assets and broader family/profile coverage.

Phase 1E adds «Добавить в корзину» only when `/preview` was created from an existing immutable quote. The action sends that opaque quote token and optional owned preview state to the server; it neither repeats pricing in the browser nor converts preview controls into price inputs. Safe request summaries proxy an available preview through the application and retain a text/item fallback when the asset is unavailable.

## 15. Связанные требования и история

Links: `FR-STANDARD-PREVIEW-001`–`008`, `FTR-012/013`, `ASSET-*`, `STD-PREV-001`–`016`.

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Определены deterministic renderer profiles, layers, family behaviors, state/errors, accessibility, export and tests. |
| 0.2.0 | 2026-08-08 | `OWNER-DECISION-014` authorizes Phase 1D; fixed two-scene SVG scope, four family profiles, asset-quality priority, ownership-scoped state/API and honest fallback boundaries. |
| 0.3.0 | 2026-08-08 | Phase 1D passed with two local photoreal scene profiles, `standard-svg-v2`, four exact variant-to-product-layer mappings, deterministic Zebra rectification, responsive controls, visual baselines and zero runtime AMIGO requests under `OWNER-DECISION-015`. |
| 0.4.0 | 2026-08-09 | Recorded the Phase 1E current-QuoteSnapshot add-to-cart action and safe request-preview proxy without browser recalculation, client photos or AI. |
