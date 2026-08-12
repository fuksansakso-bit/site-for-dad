# Canonical specifications

`docs/specs/` is the only repository location for normative product specifications.

| Folder | Single responsibility |
|---|---|
| `GLOBAL_SPEC.md` | Product-wide source of truth and owner decisions |
| `01-product/` | Features, actors, stories, flows, roles and acceptance behavior |
| `02-domain/` | Catalog, configurator, pricing, cart, staff identity, administration and other domain contracts |
| `03-ux/` | Information architecture, screens, responsive, accessibility, design and motion contracts |
| `04-technical/` | Architecture, data/API, security, storage, deployment, observability and integration contracts |

One concern has one canonical specification. New requirements extend that file and link to it; they MUST NOT create a second file with the same scope. Files such as ADR, policies, plans, quality gates, registers, evaluations and completion reports are governance/evidence rather than specifications and therefore remain in their dedicated `docs/` folders under the repository rules.

The documentation gate checks unique normative IDs, valid links, non-empty specs, unique canonical filenames/titles and rejects misplaced product `*_SPEC.md` files outside this tree (excluding explicitly named governance artifacts).
