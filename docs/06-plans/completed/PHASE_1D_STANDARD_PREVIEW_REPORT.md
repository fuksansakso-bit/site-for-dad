# Phase 1D — deterministic standard window preview completion report

## 0. Result

Implementation and CI evidence passed on 2026-08-08; only the final push/Draft-PR boundary remains before `PASSED_PHASE_1D_STANDARD_PREVIEW`. The phase delivers a guest-owned deterministic photoreal standard preview without client photos, AI, paid APIs or runtime AMIGO. Phase 1E was not started.

## 1. Исходный commit

`58eb25dcde460291ad98fde157956d7f264a666d`, merged Phase 1C `main`.

## 2. Ветка и commits

Branch `phase/1d-standard-preview`. Logical commits: `8642066` authorization, `5054ef7` domain, `37d33b0` renderer, `957b94d` Roller/Zebra, `668ea15` horizontal/vertical, `c79d685` configurator integration, `032ab38` responsive controls, `6632815` tests, `6df98d5` authorized photoreal layers and `c6226fe` Zebra physical rectification. The completion-documentation commit follows this report.

## 3. URL preview

Local route: `http://127.0.0.1:3000/preview?state={opaque-32-character-id}`. A bare/foreign/expired ID cannot disclose state.

## 4. Integration with `/configure`

After an authoritative server calculation, «Посмотреть на окне» posts only its opaque calculation token. The server creates separately owned `StandardPreviewState`; `/preview` restores the validated selection. «Вернуться в конфигуратор» opens `/configure?resume=preview` with family/system/model/material/dimensions/options retained. No registration is required and preview controls never change price.

## 5. Supported families

Roller `MINI`/2259, Zebra `ZEBRA_MINI`/5992, horizontal aluminium `CLASSIC_25`/8012 and vertical fabric `FABRIC`/5612. Any other family/profile receives an honest unavailable state, never borrowed geometry.

## 6. Scenes

Two data-driven 1500×937 photoreal local scenes: `WINDOW_CLOSEUP` and `ROOM_WINDOW`. They are approved partner assets composed inside the project's own responsive UI; runtime has no remote background request.

## 7. Previewable MaterialVariant

Four active validated variants, one for each supported Phase 1C rule scope. No second catalog, fixture material, new compatibility or price formula was added.

## 8. Asset-quality counts

`EXACT_SWATCH = 0`; `PRODUCT_IMAGE_CROP = 4`; `NORMALIZED_COLOR_ONLY = 0`; `PREVIEW_UNAVAILABLE = 0` for the four active validated configurations. The UI labels product-layer evidence honestly; synthetic color fallback and unavailable disclosures are separately tested.

## 9. Mapping gaps

Four missing `EXACT_SWATCH` roles; zero missing active `CompatibilityRule`. Exact family/system/model/variant/source IDs, blocking status and future corrections are in [PREVIEW_AND_CONFIGURATOR_MAPPING_GAPS.md](../PREVIEW_AND_CONFIGURATOR_MAPPING_GAPS.md). The original and deterministically rectified Zebra 5992 hashes/coordinates remain recorded.

## 10. Renderer technology

`standard-svg-v2`: lightweight deterministic SVG composition plus CSS transforms and local raster atlases; no Three.js, WebGL, random generation or AI. Inputs include scene/family/system/model/material/evidence/color/ratio/hardware/opening/family controls. The same canonical input produces the same checksum/output.

## 11. Visual regression

Four fixed Chromium 1280×900 baselines—Roller, Zebra, horizontal aluminium and vertical—pass. `maxDiffPixelRatio = 0.005` permits only platform raster/font antialiasing; geometry/material changes exceed it. Zebra right-sash cassette, bands, side edges and lower bar are rectified to parallel/rectangular physical geometry from the exact source layer.

## 12. Mobile result

The 375×812 case passes: no horizontal overflow, preview remains primary, family controls remain reachable one-handed, touch/focus/ARIA semantics work and the return action remains visible. Reduced motion/high contrast and loading/empty/unavailable/recovery styles are implemented without a final redesign.

## 13. Tests

Preview unit `18/18`; shared contracts `13/13`; storage unit `6/6`; web `30/30`; database migration boundary `3/3`; targeted Chromium `9/9`; four visual baselines; root typecheck, all workspace tests and production build pass. The final `pnpm ci:verify` completed all 9 stages with exit code 0 in 363.9 seconds. Integration/recovery covers ownership/lifecycle, compatibility/material lookup, missing/corrupt/storage failure, stale/hidden material, changed PriceVersion and no-runtime-AMIGO.

## 14. Skipped checks

No production deployment/provider/secret, customer photo, upload/segmentation/AI, cart/order/WhatsApp/installment/payment, final landing/starfield or Phase 1E check was run because all are outside Phase 1D. Physical color/finished measurement remains a disclosure, not a promise. The current shell printed a Node 22 engine warning; the repository's pinned Node 24 CI-equivalent gate is the authoritative toolchain run.

## 15. Acceptance Gate

QG-271–307 and QG-309–310 passed: real configurator handoff/return, local approved layers, deterministic four-family rendering, honest fallback/evidence, mobile and visual/recovery/build/security boundaries all pass. QG-308 awaits only the final clean push and Draft PR. Public runtime AMIGO request count is zero; no random material substitution exists.

## 16. Draft PR

Pending final push: the unmerged Draft PR will target `main` with title `Phase 1D: deterministic standard window preview` and will be recorded here without merging.

## 17. Git status

The implementation is committed; final push and clean-worktree evidence are recorded after PR metadata. Docker named volumes were preserved; `main` history was not rewritten.

## 18. Phase boundary

Phase 1E was not started. No client-photo/AI, cart/order/WhatsApp/payment, production deployment or unrelated Phase 1C assortment/pricing expansion was implemented.
