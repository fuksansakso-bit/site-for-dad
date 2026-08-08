# AMIGO pricing verification — 2026-08-08

## 0. Capture

| Field | Evidence |
|---|---|
| Source | Public AMIGO calculator opened from `https://shop.amigo.ru/calculator/` in the visible Grozny context |
| Calculator endpoint observed through its normal UI | `https://80bcbf2544d2118d6c1ffc708b32c673.customizer.amigo.ru/` |
| Captured at | `2026-08-08T14:11:38.6360294+03:00` |
| Source version | `amigo-public-calculator-2026-08-08-9f9246330385` |
| Combined SHA-256 | `9f92463303857984a6dbf799a2de47e7974cfea3e834f9340ddd3c03508431cd` |
| Verification status | `ADMIN_VERIFIED` for the exact rules and fixtures below; not a claim of an official/stable API |
| Access boundary | Public UI/network only, low-rate bounded requests, no login, credential, CAPTCHA bypass, hidden secret, cart or order |
| Runtime boundary | Evidence is normalized into PostgreSQL/committed fixtures; the public application never calls AMIGO during calculation |

The visible calculator flow exposed models, materials, options and calculation responses. Independent PROJECT_NAME code implements only observable input/output parity; AMIGO code, DOM and design are not copied.

## 1. Verified rule scopes

| Family | AMIGO model/material | Source rule admitted for automatic pricing | Verified envelope |
|---|---|---|---|
| Roller | model `1` `MINI`; material `93`, article `2259` | Exact `(widthMm,heightMm) → RUB` lookup from fixtures | Ten committed pairs, `400×500` through `1200×1800` |
| Zebra / Day-Night | model `6` `Зебра MINI`; material `772`, article `5992` | Exact `(widthMm,heightMm) → RUB` lookup from fixtures | Ten committed pairs, `400×500` through `1300×1800` |
| Horizontal aluminium | model `28` `Классика 25`; material `918`, article `8012` | `roundHalfUp(baseKopecks × max(1,000,000,widthMm×heightMm) / 1,000,000)` | `435–1300 × 500–1800 mm`; base 2,418 RUB |
| Vertical | model `43` `Ткань`; material `1006`, article `5612` | `roundHalfUp(baseKopecks × max(1,000,000,widthMm×heightMm) / 1,000,000)` | `400–1300 × 500–1800 mm`; base 1,585 RUB |

Dimensions outside those evidence envelopes are not declared valid automatically. They return `MANUAL_REVIEW_REQUIRED` with «Размер требует проверки мастером». Other models/materials/categories return `PRICE_ON_REQUEST` unless a later reviewed source version adds a proven rule.

## 2. Verified fixture outputs

All values are source rubles before any PROJECT_NAME local override and before the 1,500 RUB per-unit minimum.

| Family | Ten `width×height → RUB` fixtures |
|---|---|
| Roller | `400×500→1524`; `500×500→1675`; `600×800→1965`; `700×1000→2211`; `800×1200→2505`; `900×1500→2855`; `1000×1800→3037`; `1200×1600→3253`; `1100×1800→3191`; `1200×1800→3342` |
| Zebra | `400×500→2255`; `500×700→2942`; `600×900→3741`; `700×1100→4652`; `800×1200→5488`; `900×1400→6749`; `1000×1500→7538`; `1100×1600→8293`; `1200×1700→9272`; `1300×1800→10308` |
| Horizontal aluminium | `450×600→2418`; `500×700→2418`; `600×900→2418`; `700×1100→2418`; `800×1200→2418`; `900×1400→3047`; `1000×1500→3627`; `1100×1600→4256`; `1200×1700→4933`; `1300×1800→5659` |
| Vertical | `400×500→1585`; `500×700→1585`; `600×900→1585`; `700×1100→1585`; `800×1200→1585`; `900×1400→1997`; `1000×1500→2378`; `1100×1600→2790`; `1200×1700→3234`; `1300×1800→3709` |

The captured boundary `400×500` for horizontal model 28 was rejected by AMIGO because width is below 435 mm and is preserved as a negative constraint fixture. Integer half-up evaluation of the two continuous rules reproduces all listed outputs exactly; the exact lookup scopes reproduce their listed outputs exactly. Maximum observed deviation is 0 RUB.

## 3. Source artifact hashes

| Artifact | SHA-256 |
|---|---|
| Calculator page | `55a31553928a3b711515b42d8f199bfe29ae30fc6e35694ed0308e80be235a18` |
| `/api/models` response | `6ce494ab6f754272918a04f99e2d729089a11ca5d5fb83d9df1cd360f453b369` |
| Model 1 materials / options | `a1bbab7ee31fcb125743390190fc85c7b9e18e6ece79b8ef57f775f92027f42f` / `1602597f0a4d947db7b96169c35d021c5ed6de0aa38715ff3702e19df0faf41e` |
| Model 6 materials / options | `25250056e210830f0b7590c7a2a3e084bb3a4d817e62d06115253aa9a280ae8` / `01f1bcbda553856f6be92920eb2ccf840fd61a14db50e47b743965ca8b5716d5` |
| Model 28 materials / options | `3c5ff686e6e979bc941e44b8618fc2facb87e1832f6118130f54c79d8f8bbee` / `bb2a06e697a31f10e9cff7bb1caf2ea4334dc1495db0d651824d623ebe61a07d` |
| Model 43 materials / options | `2a72ca417a5ed538b137177385a96ab94bc00bcd0496ef06312e82bcb954ab99` / `743147b7ec8648fb998fd35d37282accbff45242ead24ae665ef786263b55f15` |
| Observed public calculator client | `91cf7fd7e859c9716c6e75c0e9a90c4add2384aa708419483b9626d31cc6f9a3` |

Only hashes and normalized safe fixtures are retained. Raw third-party code/responses are not committed.
