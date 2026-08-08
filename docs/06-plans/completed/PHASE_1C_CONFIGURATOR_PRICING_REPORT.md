# Phase 1C — configurator and verified pricing completion report

## 0. Result

`PASSED_PHASE_1C_CONFIGURATOR_PRICING` on 2026-08-08. The phase delivers a PostgreSQL-only guest configurator, deterministic server pricing for four verified scopes, safe non-numeric fallback elsewhere, immutable quotes and minimal pricing administration. Phase 1D and production deployment were not started.

## 1. Исходный commit

`3f1f70c986bd29518364a059393e9abd1b284a02`, merged Phase 1B.2 main.

## 2. Ветка

`phase/1c-configurator-pricing`; pre-phase user WIP remains preserved in `stash@{0}` and is not part of this phase.

## 3. Коммиты

Implementation commits: `ecf4f8e` authorization, `99c1e70` domain model, `1d49686` compatibility/dimensions, `2e2a841` pricing engine, `dc8c970` immutable snapshots, `9f9c4ab` APIs, `26fd874` guest UI, `0acd3eb` administration, `96d40fc` security/idempotency, `ca3f439` verification, `bb01d5f` formatting, `6f61e21` gate alignment and `1db3a89` acceptance evidence. The final PR-metadata commit contains this completed report and quality-gate result.

## 4. URL конфигуратора

Local guest URL: `http://127.0.0.1:3000/configure`. Saved immutable quotes use `/quote/{opaqueToken}`; pricing administration uses `/admin/pricing` behind the existing staff session.

## 5. Поддержанные семейства и системы

- Рулонные: `ROLLA Кассета` / model `MINI`, material article `2259`.
- «Зебра» / «День-Ночь»: `Классика LVT-зебра` / model `Зебра MINI`, article `5992`.
- Горизонтальные алюминиевые: `Жалюзи с лентой 16/25 мм` / model `Классика 25`, article `8012`.
- Вертикальные: fabric system / model `Ткань`, article `5612`.

These are exact reviewed scopes, not a claim that every material in the 1,655-variant catalog has an automatic formula.

## 6. Семейства `PRICE_ON_REQUEST`

The active selector exposes eight non-automatic families: ZIP terrace systems, wooden horizontal blinds, interior shutters, Roman blinds, Mirage, pleated, gofre and classic curtains. Any other unproved material/system/model combination also remains request/manual without a fake amount.

## 7. Реализованные ценовые правила

Roller MINI and Zebra MINI use exact `(widthMm,heightMm)` fixture lookup. Horizontal model 28/material 918 and vertical model 43/material 1006 use verified integer half-up area rules with a one-square-metre billable minimum only inside captured envelopes. Local override precedes source, options remain integer kopecks, and the 150,000-kopeck local minimum applies per unit before quantity.

## 8. Parity fixtures

40 committed fixtures: ten per automatically supported family, with source context/version/date, identifiers, dimensions, expected result, rounding/envelope and confirmation metadata.

## 9. Максимальное отклонение

100 kopecks (1 RUB). Exact lookup scopes deviate by 0; horizontal `1300×1800` and vertical `1200×1700` demonstrate the accepted 1-RUB bound. Any greater deviation blocks the affected rule activation.

## 10. Пример minimum 1500 ₽

The real PostgreSQL integration temporarily applied a 149,000-kopeck local override: the engine produced 150,000 kopecks per unit, then 300,000 for quantity 2. The test removed the override and verified source-price restoration; no test override remains active.

## 11. Пример quantity

A real server calculation at 158,500 kopecks per unit and quantity 3 produced 475,500 kopecks. The browser roller flow at 152,400 per unit and quantity 2 produced 304,800 kopecks. Free measurement, delivery and installation remain separate zero lines.

## 12. Active PriceVersion

Calculation PriceVersion v5 `7618714e-0baf-463a-8311-e9cf84879dd1`, source `amigo-public-calculator-2026-08-08-9f9246330385`; active CatalogVersion v2 `8975b18c-d7de-49cc-a6e6-d7566b69460a` remains unchanged.

## 13. Quote snapshot model

`QuoteSnapshot` stores an opaque token and immutable JSON snapshot of selected IDs, labels/articles, dimensions, quantity/options, complete breakdown/total, CatalogVersion, PriceVersion, source version, overrides, minimum application, status, timestamp and correlation ID. PostgreSQL triggers reject update/delete; a later override/version change leaves old bytes unchanged.

## 14. Выполненные тесты

Pricing unit/property: 13 passed. Shared contract/error suites: 9 passed. Real PostgreSQL Phase 1C integration: 1 passed. Targeted Playwright desktop/mobile: 8 passed. Root `pnpm check` passed. The exact CI-equivalent gate passed 9/9 stages in 429.9 seconds, including clean/repeat/upgrade/drift/recovery PostgreSQL, 15-case storage contract, production build/artifact/scale, 25/25 baseline browser and 5/5 active-catalog profiles, secret and critical-advisory gates. Manual in-app API/browser smoke calculated, saved and reopened a real quote.

## 15. Пропущенные проверки и причины

No production deployment, production provider, real customer data, preview, photo/AI, cart/order/WhatsApp/payment or Phase 1D test was run because each is outside this phase. The full Phase 1B.2 import was not repeated; its active PostgreSQL catalog/public/admin surfaces and preserved volumes were checked without re-researching the completed catalog. The dependency audit reported one high-severity advisory below the configured critical-only CI failure threshold; dependency remediation remains separate from this verified phase.

## 16. Acceptance Gate

QG-231–270 evidence is synchronized in `SPEC_QUALITY_GATE.md`. Server authority, integer money, compatibility/dimensions, minimum/quantity/free services, safe fallbacks, active-only version, override precedence, immutable history, parity, admin authorization, responsive browser flow, migration and scope gates pass; the exact CI-equivalent result is 9/9.

## 17. Draft PR

Draft PR [#2 — Phase 1C: configurator and verified pricing engine](https://github.com/bataevabdullah2009-pixel/site-for-dad/pull/2) targets `main` from `phase/1c-configurator-pricing`. It remains open in Draft state; no merge was performed.

## 18. Git status

The final tracked/untracked worktree is clean after the report/PR metadata commit and push. Docker named volumes remain intact and the preserved pre-phase user stash is retained.

## 19. Оставшиеся TBD

`TBD-PRICE-002`–`005` and `TBD-SIZE-001` remain partially resolved outside the four admitted scopes. `TBD-PRICE-006`, `TBD-PRICE-008`–`010`, `TBD-MECHANISM-001`, `TBD-DIM-*` and unsupported-system rules remain open; they do not receive interpolation, tax/expiry claims or automatic prices.

## 20. Phase boundary

Phase 1D was not started. No standard preview, client-photo upload, AI visualization, cart, order, WhatsApp flow, installment/payment, final landing/starfield or production deployment was implemented.
