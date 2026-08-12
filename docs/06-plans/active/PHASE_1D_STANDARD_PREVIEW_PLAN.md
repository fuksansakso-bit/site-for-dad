# Phase 1D — deterministic standard window preview plan

## 0. Execution record

| Field | Value |
|---|---|
| Status | `COMPLETED`; `PASSED_PHASE_1D_STANDARD_PREVIEW`; only Phase 1D was executed |
| Owner decision | `OWNER-DECISION-014` |
| Base commit | `58eb25dcde460291ad98fde157956d7f264a666d` |
| Branch | `phase/1d-standard-preview` |
| Runtime baseline | `/catalog`, `/configure`, pricing, PostgreSQL, worker and local object storage verified before changes |
| Excluded | Client photo/AI, upload, cart/order/WhatsApp/payment, final redesign, production and Phase 1E |

## 1. Verifiable outcome

Deliver a guest `/preview` flow opened from the real configurator through an opaque server-side state ID. Two approved locally stored photoreal scene profiles and a deterministic lightweight renderer show the selected locally mirrored partner layer where evidence permits, support Roller, Zebra, horizontal aluminium and vertical controls, retain the configurator choice on return, and use an explicit color-only or unavailable fallback without a runtime AMIGO request.

## 2. Stages

- [x] Verify merged Phase 1C, clean baseline, routes, server pricing, PostgreSQL, worker and local object storage without deleting volumes.
- [x] Authorize only Phase 1D in canonical specifications and define entry/completion gates.
- [x] Add versioned preview domain/contracts, PostgreSQL state and ownership-scoped API.
- [x] Add two approved local photoreal scenes and deterministic family renderer profiles.
- [x] Integrate `/configure` → `/preview` → `/configure` without losing selection.
- [x] Add responsive accessible controls, honest fallbacks and targeted diagnostics.
- [x] Record real mapping/asset-quality gaps and counts from the active catalog.
- [x] Pass unit, contract, integration, browser, visual, recovery, build and CI-equivalent gates.
- [x] Complete affected documentation, preserve logical commits, push and open an unmerged Draft PR.

## 3. Safety and evidence boundary

- PostgreSQL active catalog and approved local `StoragePort` assets are the only runtime sources; remote URLs and client-supplied prices/configuration objects are rejected.
- Exact swatch outranks product-image crop, which outranks an explicitly labelled normalized-color fallback; missing or invalid evidence becomes `PREVIEW_UNAVAILABLE`.
- Preview controls do not change price. A real price-affecting option must first create a newly validated server-side calculation in the configurator.
- `StandardPreviewState` is mutable and ownership-scoped, but its referenced pricing calculation or quote snapshot remains immutable.
- Unsupported families receive a textual unavailable state, never a generic Roller rendering.

## 4. Logical commits

1. `docs: authorize Phase 1D`
2. `feat: add standard preview domain`
3. `feat: add deterministic preview renderer`
4. `feat: add roller and zebra preview`
5. `feat: add horizontal and vertical preview`
6. `feat: integrate preview with configurator`
7. `feat: add responsive preview controls`
8. `test: add preview and visual regression coverage`
9. `docs: complete Phase 1D`

## 5. Blockers and decisions

No blocker remains. `OWNER-DECISION-015` records the owner's explicit partner permission and request for locally mirrored photoreal AMIGO scene/product layers; no AMIGO frontend code was copied. Individual missing evidence degrades independently and is recorded in `PREVIEW_AND_CONFIGURATOR_MAPPING_GAPS.md`. Phase 1E is not authorized and was not started.
